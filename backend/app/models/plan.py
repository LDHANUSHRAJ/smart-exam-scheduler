"""StudyPlan and ExamConflict models."""

import uuid
from datetime import datetime, date
from sqlalchemy import String, Integer, Float, Boolean, Date, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class StudyPlan(Base):
    __tablename__ = "study_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    generated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    valid_from: Mapped[date] = mapped_column(Date, nullable=False)
    valid_until: Mapped[date] = mapped_column(Date, nullable=False)
    total_study_hours: Mapped[float | None] = mapped_column(Float)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    user = relationship("User", back_populates="study_plans")
    sessions = relationship("StudySession", back_populates="plan", cascade="all, delete-orphan")


class ExamConflict(Base):
    __tablename__ = "exam_conflicts"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    exam_a_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("exams.id"), nullable=False
    )
    exam_b_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("exams.id"), nullable=False
    )
    conflict_type: Mapped[str | None] = mapped_column(String(50))
    days_apart: Mapped[int | None] = mapped_column(Integer)
