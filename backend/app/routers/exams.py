"""Exams router — CRUD + conflict detection."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.database import get_db
from app.models.user import User
from app.models.exam import Exam
from app.models.plan import ExamConflict
from app.schemas.exam import ExamCreate, ExamUpdate, ExamResponse, ConflictResponse, ConflictPair
from app.core.dependencies import get_current_user
from app.algorithms.conflict_detector import detect_conflicts, get_color_hex
from app.services.cache import invalidate_user_cache

router = APIRouter(prefix="/api/v1/exams", tags=["exams"])


async def _run_conflict_detection(user_id: UUID, db: AsyncSession):
    """Background task: detect conflicts and update exam color codes."""
    result = await db.execute(select(Exam).where(Exam.user_id == user_id))
    exams = result.scalars().all()

    exam_dicts = [
        {"id": str(e.id), "subject_name": e.subject_name, "exam_date": e.exam_date}
        for e in exams
    ]
    conflicts = detect_conflicts(exam_dicts)

    # Update exam color codes and conflict groups
    color_assignment = conflicts["color_assignment"]
    for exam in exams:
        exam_id_str = str(exam.id)
        if exam_id_str in color_assignment:
            exam.conflict_group = color_assignment[exam_id_str]
            exam.color_code = get_color_hex(color_assignment[exam_id_str])

    # Clear old conflicts and save new ones
    await db.execute(
        delete(ExamConflict).where(
            (ExamConflict.exam_a_id.in_([e.id for e in exams]))
            | (ExamConflict.exam_b_id.in_([e.id for e in exams]))
        )
    )

    for pair in conflicts["conflict_pairs"]:
        db.add(ExamConflict(
            exam_a_id=UUID(pair["exam_a"]),
            exam_b_id=UUID(pair["exam_b"]),
            conflict_type=pair["conflict_type"],
            days_apart=pair["days_apart"],
        ))

    await db.commit()
    await invalidate_user_cache(str(user_id))


@router.post("/", response_model=ExamResponse, status_code=201)
async def create_exam(
    body: ExamCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new exam and trigger conflict detection in background."""
    exam = Exam(user_id=user.id, **body.model_dump())
    db.add(exam)
    await db.flush()
    await db.refresh(exam)

    # Trigger conflict detection
    background_tasks.add_task(_run_conflict_detection, user.id, db)

    return exam


@router.get("/", response_model=list[ExamResponse])
async def list_exams(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all exams for the current user."""
    result = await db.execute(
        select(Exam).where(Exam.user_id == user.id).order_by(Exam.exam_date)
    )
    return result.scalars().all()


@router.put("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: UUID,
    body: ExamUpdate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an exam."""
    result = await db.execute(
        select(Exam).where(Exam.id == exam_id, Exam.user_id == user.id)
    )
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(exam, key, value)

    await db.flush()
    await db.refresh(exam)

    background_tasks.add_task(_run_conflict_detection, user.id, db)
    return exam


@router.delete("/{exam_id}", status_code=204)
async def delete_exam(
    exam_id: UUID,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an exam and its topics/sessions (cascade)."""
    result = await db.execute(
        select(Exam).where(Exam.id == exam_id, Exam.user_id == user.id)
    )
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    await db.delete(exam)
    await db.flush()

    background_tasks.add_task(_run_conflict_detection, user.id, db)


@router.get("/conflicts", response_model=ConflictResponse)
async def get_conflicts(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run conflict detector and return conflict analysis."""
    result = await db.execute(
        select(Exam).where(Exam.user_id == user.id).order_by(Exam.exam_date)
    )
    exams = result.scalars().all()

    exam_dicts = [
        {"id": str(e.id), "subject_name": e.subject_name, "exam_date": e.exam_date}
        for e in exams
    ]
    conflicts = detect_conflicts(exam_dicts)

    # Build exam name lookup
    name_lookup = {str(e.id): e.subject_name for e in exams}

    conflict_pairs = [
        ConflictPair(
            exam_a=UUID(p["exam_a"]),
            exam_b=UUID(p["exam_b"]),
            exam_a_name=name_lookup.get(p["exam_a"]),
            exam_b_name=name_lookup.get(p["exam_b"]),
            days_apart=p["days_apart"],
            conflict_type=p["conflict_type"],
        )
        for p in conflicts["conflict_pairs"]
    ]

    return ConflictResponse(
        color_assignment=conflicts["color_assignment"],
        conflict_pairs=conflict_pairs,
        chromatic_number=conflicts["chromatic_number"],
        total_exams=conflicts["total_exams"],
        total_conflicts=conflicts["total_conflicts"],
    )
