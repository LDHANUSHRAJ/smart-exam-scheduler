"""Auth router — registration, login, token refresh, profile."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserRegister,
    UserLogin,
    UserResponse,
    UserConstraintsUpdate,
    TokenResponse,
    RefreshRequest,
)
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(body: UserRegister, db: AsyncSession = Depends(get_db)):
    """Create a new user account."""
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate and return JWT tokens."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token using a valid refresh token."""
    user_id = decode_token(body.refresh_token, expected_type="refresh")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get current user profile."""
    return user


@router.put("/me/constraints", response_model=UserResponse)
async def update_constraints(
    body: UserConstraintsUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update user study constraints (daily hours, sleep schedule)."""
    if body.daily_study_hours is not None:
        user.daily_study_hours = body.daily_study_hours
    if body.sleep_start_hour is not None:
        user.sleep_start_hour = body.sleep_start_hour
    if body.sleep_end_hour is not None:
        user.sleep_end_hour = body.sleep_end_hour

    await db.flush()
    await db.refresh(user)
    return user
