"""Progress router — session complete/skip, summary, heatmap."""

from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models.user import User
from app.models.exam import Exam
from app.models.topic import Topic
from app.models.plan import StudyPlan
from app.models.study_session import StudySession
from app.schemas.progress import (
    SessionCompleteRequest,
    SessionSkipRequest,
    ProgressSummary,
    HeatmapEntry,
    HeatmapResponse,
)
from app.core.dependencies import get_current_user
from app.algorithms.adaptive_replanner import greedy_reschedule
from app.algorithms.study_allocator import compute_priority_score
from app.services.cache import invalidate_user_cache, cache_delete_pattern, plan_day_key

router = APIRouter(prefix="/api/v1/progress", tags=["progress"])


@router.put("/session/{session_id}/complete")
async def mark_session_complete(
    session_id: UUID,
    body: SessionCompleteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a study session as complete and update topic completion."""
    result = await db.execute(
        select(StudySession)
        .join(StudyPlan)
        .where(StudySession.id == session_id, StudyPlan.user_id == user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = "completed"
    session.actual_duration_minutes = body.actual_duration_minutes or session.duration_minutes

    # Update topic completion
    topic_result = await db.execute(select(Topic).where(Topic.id == session.topic_id))
    topic = topic_result.scalar_one_or_none()
    if topic:
        # Count total and completed sessions for this topic
        total_result = await db.execute(
            select(func.count())
            .where(StudySession.topic_id == topic.id, StudySession.plan_id == session.plan_id)
        )
        total_sessions = total_result.scalar()

        completed_result = await db.execute(
            select(func.count())
            .where(
                StudySession.topic_id == topic.id,
                StudySession.plan_id == session.plan_id,
                StudySession.status == "completed",
            )
        )
        completed_sessions = completed_result.scalar()

        if total_sessions > 0:
            topic.completion_percent = round((completed_sessions / total_sessions) * 100, 1)
            topic.is_completed = topic.completion_percent >= 100.0

    await db.flush()

    # Invalidate cache for this day
    await cache_delete_pattern(
        plan_day_key(str(user.id), session.scheduled_date.isoformat())
    )

    return {"status": "completed", "session_id": str(session_id)}


@router.put("/session/{session_id}/skip")
async def mark_session_skipped(
    session_id: UUID,
    body: SessionSkipRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a session as skipped and trigger greedy re-scheduling.
    The skipped session's time is redistributed across remaining days.
    """
    result = await db.execute(
        select(StudySession)
        .join(StudyPlan)
        .where(StudySession.id == session_id, StudyPlan.user_id == user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = "skipped"
    session.skipped_reason = body.reason

    # Get exam date
    exam_result = await db.execute(select(Exam).where(Exam.id == session.exam_id))
    exam = exam_result.scalar_one_or_none()
    if not exam:
        await db.flush()
        return {"status": "skipped", "rescheduled": False, "message": "No exam found for rescheduling"}

    # Get remaining sessions for this exam
    remaining_result = await db.execute(
        select(StudySession).where(
            StudySession.plan_id == session.plan_id,
            StudySession.exam_id == session.exam_id,
            StudySession.status == "pending",
            StudySession.scheduled_date > date.today(),
        )
    )
    remaining_sessions = [
        {
            "id": str(s.id),
            "scheduled_date": s.scheduled_date,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "duration_minutes": s.duration_minutes,
        }
        for s in remaining_result.scalars().all()
    ]

    # Get incomplete topics for this exam
    topic_result = await db.execute(
        select(Topic).where(Topic.exam_id == exam.id, Topic.is_completed == False)
    )
    incomplete_topics = [
        {
            "id": str(t.id),
            "exam_id": str(t.exam_id),
            "name": t.name,
            "estimated_hours": t.estimated_hours or 2.0,
            "priority_score": compute_priority_score(
                t.weightage_percent, t.difficulty_score, t.past_score_percent or 50.0
            ),
            "remaining_hours": (t.estimated_hours or 2.0) * (1 - t.completion_percent / 100.0),
        }
        for t in topic_result.scalars().all()
    ]

    # Run greedy re-scheduler
    reschedule_result = greedy_reschedule(
        skipped_session={
            "id": str(session.id),
            "duration_minutes": session.duration_minutes,
        },
        remaining_sessions=remaining_sessions,
        incomplete_topics=incomplete_topics,
        exam_date=exam.exam_date,
        daily_hours=user.daily_study_hours,
        sleep_start_hour=user.sleep_start_hour,
        sleep_end_hour=user.sleep_end_hour,
    )

    # Persist new sessions from rescheduler
    for new_s in reschedule_result.get("new_sessions", []):
        new_session = StudySession(
            plan_id=session.plan_id,
            topic_id=UUID(new_s["topic_id"]),
            exam_id=UUID(new_s["exam_id"]) if new_s.get("exam_id") else None,
            scheduled_date=new_s["scheduled_date"],
            start_time=new_s["start_time"],
            end_time=new_s["end_time"],
            duration_minutes=new_s["duration_minutes"],
            priority_score=new_s.get("priority_score"),
            status="pending",
        )
        db.add(new_session)

    await db.flush()
    await invalidate_user_cache(str(user.id))

    return {
        "status": "skipped",
        "rescheduled": len(reschedule_result.get("new_sessions", [])) > 0,
        "hours_recovered": reschedule_result.get("hours_recovered", 0),
        "hours_unrecovered": reschedule_result.get("hours_unrecovered", 0),
        "critical": reschedule_result.get("critical", False),
        "message": reschedule_result.get("message", ""),
        "new_sessions_count": len(reschedule_result.get("new_sessions", [])),
    }


@router.get("/summary", response_model=ProgressSummary)
async def get_progress_summary(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get overall progress summary."""
    plan_result = await db.execute(
        select(StudyPlan)
        .where(StudyPlan.user_id == user.id, StudyPlan.is_active == True)
    )
    plan = plan_result.scalar_one_or_none()

    if not plan:
        return ProgressSummary(
            total_hours_studied=0,
            total_sessions=0,
            sessions_completed=0,
            sessions_skipped=0,
            sessions_pending=0,
            topics_completed=0,
            total_topics=0,
            overall_completion_percent=0,
        )

    # Count sessions by status
    sessions_result = await db.execute(
        select(StudySession).where(StudySession.plan_id == plan.id)
    )
    sessions = sessions_result.scalars().all()

    completed = [s for s in sessions if s.status == "completed"]
    skipped = [s for s in sessions if s.status == "skipped"]
    pending = [s for s in sessions if s.status == "pending"]

    total_hours = sum(
        (s.actual_duration_minutes or s.duration_minutes) / 60.0 for s in completed
    )

    # Count topics
    exam_result = await db.execute(
        select(Exam).where(Exam.user_id == user.id)
    )
    exam_ids = [e.id for e in exam_result.scalars().all()]

    if exam_ids:
        topic_result = await db.execute(
            select(Topic).where(Topic.exam_id.in_(exam_ids))
        )
        topics = topic_result.scalars().all()
        topics_completed = sum(1 for t in topics if t.is_completed)
        total_topics = len(topics)
    else:
        topics_completed = 0
        total_topics = 0

    overall = (len(completed) / len(sessions) * 100) if sessions else 0

    return ProgressSummary(
        total_hours_studied=round(total_hours, 1),
        total_sessions=len(sessions),
        sessions_completed=len(completed),
        sessions_skipped=len(skipped),
        sessions_pending=len(pending),
        topics_completed=topics_completed,
        total_topics=total_topics,
        overall_completion_percent=round(overall, 1),
    )


@router.get("/heatmap", response_model=HeatmapResponse)
async def get_progress_heatmap(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get topic-level progress heatmap data."""
    exam_result = await db.execute(
        select(Exam).where(Exam.user_id == user.id).order_by(Exam.exam_date)
    )
    exams = exam_result.scalars().all()

    entries = []
    subjects = []
    for exam in exams:
        subjects.append(exam.subject_name)
        topic_result = await db.execute(
            select(Topic).where(Topic.exam_id == exam.id)
        )
        for topic in topic_result.scalars().all():
            priority = compute_priority_score(
                topic.weightage_percent,
                topic.difficulty_score,
                topic.past_score_percent or 50.0,
            )
            entries.append(HeatmapEntry(
                exam_subject=exam.subject_name,
                topic_name=topic.name,
                completion_percent=topic.completion_percent,
                difficulty_score=topic.difficulty_score,
                priority_score=priority,
            ))

    return HeatmapResponse(entries=entries, subjects=subjects)
