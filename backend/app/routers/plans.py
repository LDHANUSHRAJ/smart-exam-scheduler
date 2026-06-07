"""Plans router — generate study plan, get calendar events, daily view."""

from datetime import date, datetime
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.database import get_db
from app.models.user import User
from app.models.exam import Exam
from app.models.topic import Topic
from app.models.plan import StudyPlan
from app.models.study_session import StudySession
from app.schemas.plan import (
    GeneratePlanRequest,
    StudyPlanResponse,
    StudySessionResponse,
    CalendarEvent,
)
from app.core.dependencies import get_current_user
from app.algorithms.plan_generator import PlanGenerator
from app.services.cache import cache_set, cache_get, invalidate_user_cache, plan_day_key

router = APIRouter(prefix="/api/v1/plans", tags=["plans"])


@router.post("/generate", response_model=StudyPlanResponse)
async def generate_plan(
    body: GeneratePlanRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger full plan generation pipeline:
    1. Detect conflicts (graph coloring)
    2. Compute priority scores
    3. Run knapsack allocation per day
    4. Persist plan + sessions
    5. Cache daily views
    """
    # Deactivate any existing active plans
    await db.execute(
        update(StudyPlan)
        .where(StudyPlan.user_id == user.id, StudyPlan.is_active == True)
        .values(is_active=False)
    )

    # Fetch all exams with topics
    exam_result = await db.execute(
        select(Exam).where(Exam.user_id == user.id).order_by(Exam.exam_date)
    )
    exams = exam_result.scalars().all()
    if not exams:
        raise HTTPException(status_code=400, detail="No exams found. Add exams first.")

    # Fetch all topics
    exam_ids = [e.id for e in exams]
    topic_result = await db.execute(
        select(Topic).where(Topic.exam_id.in_(exam_ids))
    )
    topics = topic_result.scalars().all()
    if not topics:
        raise HTTPException(status_code=400, detail="No topics found. Add topics to your exams first.")

    # Build dicts for the generator
    exam_dicts = [
        {
            "id": e.id,
            "subject_name": e.subject_name,
            "exam_date": e.exam_date,
            "color_code": e.color_code,
        }
        for e in exams
    ]
    topic_dicts = [
        {
            "id": t.id,
            "exam_id": t.exam_id,
            "name": t.name,
            "weightage_percent": t.weightage_percent,
            "difficulty_score": t.difficulty_score,
            "estimated_hours": t.estimated_hours or 2.0,
            "past_score_percent": t.past_score_percent or 50.0,
            "completion_percent": t.completion_percent,
        }
        for t in topics
    ]

    # Run the plan generator
    generator = PlanGenerator(
        exams=exam_dicts,
        topics=topic_dicts,
        daily_hours=body.daily_study_hours,
        sleep_start_hour=user.sleep_start_hour,
        sleep_end_hour=user.sleep_end_hour,
        buffer_days=body.buffer_days_before_exam,
        include_weekends=body.include_weekends,
    )
    plan_data = generator.generate(body.start_date)

    # Persist study plan
    study_plan = StudyPlan(
        user_id=user.id,
        valid_from=plan_data["valid_from"],
        valid_until=plan_data["valid_until"],
        total_study_hours=plan_data["total_study_hours"],
        is_active=True,
    )
    db.add(study_plan)
    await db.flush()

    # Persist study sessions
    sessions_by_date = {}
    for date_str, sessions in plan_data["sessions_by_date"].items():
        sessions_by_date[date_str] = []
        for s in sessions:
            session = StudySession(
                plan_id=study_plan.id,
                topic_id=UUID(s["topic_id"]),
                exam_id=UUID(s["exam_id"]),
                scheduled_date=s["scheduled_date"],
                start_time=s["start_time"],
                end_time=s["end_time"],
                duration_minutes=s["duration_minutes"],
                priority_score=s["priority_score"],
                status="pending",
            )
            db.add(session)
            await db.flush()
            await db.refresh(session)

            sessions_by_date[date_str].append(
                StudySessionResponse(
                    id=session.id,
                    topic_name=s["topic_name"],
                    exam_subject=s["exam_subject"],
                    exam_date=s["scheduled_date"],
                    scheduled_date=s["scheduled_date"],
                    start_time=s["start_time"],
                    end_time=s["end_time"],
                    duration_minutes=s["duration_minutes"],
                    priority_score=s["priority_score"],
                    status="pending",
                    color_code=s["color_code"],
                )
            )

    # Cache daily views
    for date_str, sessions in sessions_by_date.items():
        await cache_set(
            plan_day_key(str(user.id), date_str),
            [s.model_dump(mode="json") for s in sessions],
            ttl_seconds=86400,
        )

    return StudyPlanResponse(
        plan_id=study_plan.id,
        valid_from=plan_data["valid_from"],
        valid_until=plan_data["valid_until"],
        total_sessions=plan_data["total_sessions"],
        total_study_hours=plan_data["total_study_hours"],
        conflict_summary=plan_data["conflict_summary"],
        sessions_by_date=sessions_by_date,
        warnings=plan_data["warnings"],
    )


@router.get("/active")
async def get_active_plan(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current active plan with sessions."""
    result = await db.execute(
        select(StudyPlan)
        .where(StudyPlan.user_id == user.id, StudyPlan.is_active == True)
        .order_by(StudyPlan.generated_at.desc())
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="No active plan found. Generate a plan first.")

    # Fetch sessions with topic and exam info
    session_result = await db.execute(
        select(StudySession)
        .where(StudySession.plan_id == plan.id)
        .order_by(StudySession.scheduled_date, StudySession.start_time)
    )
    sessions = session_result.scalars().all()

    # Load topic and exam names
    topic_ids = list({s.topic_id for s in sessions})
    exam_ids = list({s.exam_id for s in sessions if s.exam_id})

    topic_result = await db.execute(select(Topic).where(Topic.id.in_(topic_ids)))
    topic_map = {t.id: t for t in topic_result.scalars().all()}

    exam_result = await db.execute(select(Exam).where(Exam.id.in_(exam_ids)))
    exam_map = {e.id: e for e in exam_result.scalars().all()}

    sessions_by_date = {}
    for s in sessions:
        date_str = s.scheduled_date.isoformat()
        topic = topic_map.get(s.topic_id)
        exam = exam_map.get(s.exam_id)

        session_resp = {
            "id": str(s.id),
            "topic_name": topic.name if topic else "Unknown",
            "exam_subject": exam.subject_name if exam else "Unknown",
            "exam_date": exam.exam_date.isoformat() if exam else None,
            "scheduled_date": s.scheduled_date.isoformat(),
            "start_time": s.start_time.isoformat(),
            "end_time": s.end_time.isoformat(),
            "duration_minutes": s.duration_minutes,
            "priority_score": s.priority_score or 0.0,
            "status": s.status,
            "color_code": exam.color_code if exam else "#6366f1",
        }

        if date_str not in sessions_by_date:
            sessions_by_date[date_str] = []
        sessions_by_date[date_str].append(session_resp)

    return {
        "plan_id": str(plan.id),
        "valid_from": plan.valid_from.isoformat(),
        "valid_until": plan.valid_until.isoformat(),
        "total_study_hours": plan.total_study_hours,
        "is_active": plan.is_active,
        "sessions_by_date": sessions_by_date,
    }


@router.get("/calendar", response_model=list[CalendarEvent])
async def get_calendar_events(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get study sessions formatted for FullCalendar."""
    result = await db.execute(
        select(StudyPlan)
        .where(StudyPlan.user_id == user.id, StudyPlan.is_active == True)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        return []

    session_result = await db.execute(
        select(StudySession).where(StudySession.plan_id == plan.id)
    )
    sessions = session_result.scalars().all()

    # Load topic and exam info
    topic_ids = list({s.topic_id for s in sessions})
    exam_ids = list({s.exam_id for s in sessions if s.exam_id})

    topic_result = await db.execute(select(Topic).where(Topic.id.in_(topic_ids)))
    topic_map = {t.id: t for t in topic_result.scalars().all()}

    exam_result = await db.execute(select(Exam).where(Exam.id.in_(exam_ids)))
    exam_map = {e.id: e for e in exam_result.scalars().all()}

    events = []
    for s in sessions:
        topic = topic_map.get(s.topic_id)
        exam = exam_map.get(s.exam_id)
        color = exam.color_code if exam and exam.color_code else "#6366f1"

        start_dt = datetime.combine(s.scheduled_date, s.start_time)
        end_dt = datetime.combine(s.scheduled_date, s.end_time)

        events.append(CalendarEvent(
            id=str(s.id),
            title=f"{topic.name if topic else 'Topic'} — {exam.subject_name if exam else 'Exam'}",
            start=start_dt.isoformat(),
            end=end_dt.isoformat(),
            backgroundColor=color,
            borderColor=color,
            extendedProps={
                "priority_score": s.priority_score or 0.0,
                "status": s.status,
                "duration_minutes": s.duration_minutes,
                "topic_id": str(s.topic_id),
                "exam_id": str(s.exam_id) if s.exam_id else None,
            },
        ))

    return events


@router.get("/day/{target_date}")
async def get_day_plan(
    target_date: date,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get sessions for a specific date (Redis-cached)."""
    date_str = target_date.isoformat()

    # Try cache first
    cached = await cache_get(plan_day_key(str(user.id), date_str))
    if cached:
        return {"date": date_str, "sessions": cached, "cached": True}

    # Cache miss — query from DB
    result = await db.execute(
        select(StudyPlan)
        .where(StudyPlan.user_id == user.id, StudyPlan.is_active == True)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        return {"date": date_str, "sessions": [], "cached": False}

    session_result = await db.execute(
        select(StudySession)
        .where(StudySession.plan_id == plan.id, StudySession.scheduled_date == target_date)
        .order_by(StudySession.start_time)
    )
    sessions = session_result.scalars().all()

    topic_ids = list({s.topic_id for s in sessions})
    exam_ids = list({s.exam_id for s in sessions if s.exam_id})

    topic_result = await db.execute(select(Topic).where(Topic.id.in_(topic_ids))) if topic_ids else None
    topic_map = {t.id: t for t in (topic_result.scalars().all() if topic_result else [])}

    exam_result = await db.execute(select(Exam).where(Exam.id.in_(exam_ids))) if exam_ids else None
    exam_map = {e.id: e for e in (exam_result.scalars().all() if exam_result else [])}

    session_list = []
    for s in sessions:
        topic = topic_map.get(s.topic_id)
        exam = exam_map.get(s.exam_id)
        session_list.append({
            "id": str(s.id),
            "topic_name": topic.name if topic else "Unknown",
            "exam_subject": exam.subject_name if exam else "Unknown",
            "start_time": s.start_time.isoformat(),
            "end_time": s.end_time.isoformat(),
            "duration_minutes": s.duration_minutes,
            "priority_score": s.priority_score or 0.0,
            "status": s.status,
            "color_code": exam.color_code if exam and exam.color_code else "#6366f1",
        })

    # Cache for future reads
    await cache_set(plan_day_key(str(user.id), date_str), session_list, ttl_seconds=86400)

    return {"date": date_str, "sessions": session_list, "cached": False}
