"""StudySession model — individual scheduled blocks within a plan."""

import uuid
from datetime import datetime, date, time
from sqlalchemy import String, Integer, Float, Date, Time, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class StudySession(Base):
    __tablename__ = "study_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("study_plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    topic_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("topics.id", ondelete="CASCADE"), nullable=False
    )
    exam_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("exams.id"), nullable=True
    )
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    priority_score: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    skipped_reason: Mapped[str | None] = mapped_column(String(255))
    actual_duration_minutes: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

    # Relationships
    plan = relationship("StudyPlan", back_populates="sessions")
    topic = relationship("Topic", back_populates="study_sessions")
    exam = relationship("Exam", back_populates="study_sessions")
