"""Exam and Topic Pydantic schemas."""

from datetime import date, time, datetime
from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional, List


# ---------- Exam Schemas ----------

class ExamCreate(BaseModel):
    subject_name: str = Field(max_length=255)
    exam_date: date
    exam_start_time: Optional[time] = None
    duration_minutes: int = Field(default=180, ge=30, le=600)
    total_marks: int = Field(default=100, ge=1)


class ExamUpdate(BaseModel):
    subject_name: Optional[str] = Field(None, max_length=255)
    exam_date: Optional[date] = None
    exam_start_time: Optional[time] = None
    duration_minutes: Optional[int] = Field(None, ge=30, le=600)
    total_marks: Optional[int] = Field(None, ge=1)


class ExamResponse(BaseModel):
    id: UUID
    user_id: UUID
    subject_name: str
    exam_date: date
    exam_start_time: Optional[time]
    duration_minutes: int
    total_marks: int
    color_code: Optional[str]
    conflict_group: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------- Topic Schemas ----------

class TopicCreate(BaseModel):
    exam_id: UUID
    name: str = Field(max_length=255)
    weightage_percent: float = Field(ge=0, le=100)
    difficulty_score: int = Field(ge=1, le=5)
    estimated_hours: Optional[float] = Field(None, ge=0.5)
    past_score_percent: Optional[float] = Field(None, ge=0, le=100)


class TopicUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    weightage_percent: Optional[float] = Field(None, ge=0, le=100)
    difficulty_score: Optional[int] = Field(None, ge=1, le=5)
    estimated_hours: Optional[float] = Field(None, ge=0.5)
    past_score_percent: Optional[float] = Field(None, ge=0, le=100)


class TopicProgressUpdate(BaseModel):
    completion_percent: float = Field(ge=0, le=100)


class TopicResponse(BaseModel):
    id: UUID
    exam_id: UUID
    name: str
    weightage_percent: float
    difficulty_score: int
    estimated_hours: Optional[float]
    past_score_percent: Optional[float]
    is_completed: bool
    completion_percent: float
    priority_score: Optional[float] = None  # computed field

    model_config = {"from_attributes": True}


# ---------- Conflict Schemas ----------

class ConflictPair(BaseModel):
    exam_a: UUID
    exam_b: UUID
    exam_a_name: Optional[str] = None
    exam_b_name: Optional[str] = None
    days_apart: int
    conflict_type: str


class ConflictResponse(BaseModel):
    color_assignment: dict
    conflict_pairs: List[ConflictPair]
    chromatic_number: int
    total_exams: int
    total_conflicts: int
