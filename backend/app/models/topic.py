"""Topic model — belongs to an exam, stores weightage and student performance data."""

import uuid
from sqlalchemy import String, Float, Integer, Boolean, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    exam_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    weightage_percent: Mapped[float] = mapped_column(Float, nullable=False)
    difficulty_score: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_hours: Mapped[float | None] = mapped_column(Float)
    past_score_percent: Mapped[float | None] = mapped_column(Float)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completion_percent: Mapped[float] = mapped_column(Float, default=0.0)

    __table_args__ = (
        CheckConstraint("difficulty_score BETWEEN 1 AND 5", name="ck_difficulty_range"),
    )

    # Relationships
    exam = relationship("Exam", back_populates="topics")
    study_sessions = relationship("StudySession", back_populates="topic")
