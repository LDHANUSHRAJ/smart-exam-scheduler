"""User Pydantic schemas."""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    daily_study_hours: float
    sleep_start_hour: int
    sleep_end_hour: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UserConstraintsUpdate(BaseModel):
    daily_study_hours: Optional[float] = Field(None, ge=1.0, le=16.0)
    sleep_start_hour: Optional[int] = Field(None, ge=0, le=23)
    sleep_end_hour: Optional[int] = Field(None, ge=0, le=23)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str
