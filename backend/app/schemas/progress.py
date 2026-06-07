"""Progress tracking schemas."""

from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional, List, Dict


class SessionCompleteRequest(BaseModel):
    actual_duration_minutes: Optional[int] = None


class SessionSkipRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=255)


class ProgressSummary(BaseModel):
    total_hours_studied: float
    total_sessions: int
    sessions_completed: int
    sessions_skipped: int
    sessions_pending: int
    topics_completed: int
    total_topics: int
    overall_completion_percent: float


class HeatmapEntry(BaseModel):
    exam_subject: str
    topic_name: str
    completion_percent: float
    difficulty_score: int
    priority_score: float


class HeatmapResponse(BaseModel):
    entries: List[HeatmapEntry]
    subjects: List[str]
