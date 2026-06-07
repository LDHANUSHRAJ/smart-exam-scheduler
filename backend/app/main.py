"""
Smart Exam Scheduler — FastAPI Application Entry Point

Features:
- Graph Coloring for exam conflict detection
- 0/1 Knapsack DP for optimal study hour allocation
- Greedy Re-scheduling for adaptive daily replanning
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import auth, exams, topics, plans, progress


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB tables on startup."""
    await init_db()
    yield


app = FastAPI(
    title="Smart Exam Scheduler",
    description=(
        "Algorithmic study planner using Graph Coloring, "
        "0/1 Knapsack DP, and Greedy Re-scheduling."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(exams.router)
app.include_router(topics.router)
app.include_router(plans.router)
app.include_router(progress.router)


@app.get("/", tags=["health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "Smart Exam Scheduler API",
        "version": "1.0.0",
    }


@app.get("/api/v1/health", tags=["health"])
async def api_health():
    return {"status": "ok"}
