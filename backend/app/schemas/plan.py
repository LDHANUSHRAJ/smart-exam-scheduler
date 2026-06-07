"""Plan and session Pydantic schemas."""

from datetime import date, time
from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional, Dict, List


class GeneratePlanRequest(BaseModel):
    start_date: date
    include_weekends: bool = True
    daily_study_hours: float = Field(default=6.0, ge=1.0, le=16.0)
    buffer_days_before_exam: int = Field(default=1, ge=0, le=3)


class StudySessionResponse(BaseModel):
    id: UUID
    topic_name: str
    exam_subject: str
    exam_date: date
    scheduled_date: date
    start_time: time
    end_time: time
    duration_minutes: int
    priority_score: float
    status: str
    color_code: str

    model_config = {"from_attributes": True}


class StudyPlanResponse(BaseModel):
    plan_id: UUID
    valid_from: date
    valid_until: date
    total_sessions: int
    total_study_hours: float
    conflict_summary: dict
    sessions_by_date: Dict[str, List[StudySessionResponse]]
    warnings: List[str]


class CalendarEvent(BaseModel):
    id: str
    title: str
    start: str  # ISO datetime
    end: str    # ISO datetime
    backgroundColor: str
    borderColor: str
    extendedProps: dict
