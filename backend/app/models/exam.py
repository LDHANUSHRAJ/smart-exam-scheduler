"""Exam model — stores exam schedule and conflict grouping from graph coloring."""

import uuid
from datetime import datetime, date, time
from sqlalchemy import String, Integer, Date, Time, Float, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject_name: Mapped[str] = mapped_column(String(255), nullable=False)
    exam_date: Mapped[date] = mapped_column(Date, nullable=False)
    exam_start_time: Mapped[time | None] = mapped_column(Time)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=180)
    total_marks: Mapped[int] = mapped_column(Integer, default=100)
    color_code: Mapped[str | None] = mapped_column(String(7))
    conflict_group: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

    # Relationships
    user = relationship("User", back_populates="exams")
    topics = relationship("Topic", back_populates="exam", cascade="all, delete-orphan")
    study_sessions = relationship("StudySession", back_populates="exam")
