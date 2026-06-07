"""Topics router — CRUD for exam topics with priority score preview."""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import csv
import json
import io

from app.database import get_db
from app.models.user import User
from app.models.exam import Exam
from app.models.topic import Topic
from app.schemas.exam import TopicCreate, TopicUpdate, TopicProgressUpdate, TopicResponse
from app.core.dependencies import get_current_user
from app.algorithms.study_allocator import compute_priority_score
from app.services.cache import invalidate_user_cache

router = APIRouter(prefix="/api/v1/topics", tags=["topics"])


def _enrich_topic(topic: Topic) -> TopicResponse:
    """Add computed priority_score to topic response."""
    priority = compute_priority_score(
        topic.weightage_percent,
        topic.difficulty_score,
        topic.past_score_percent or 50.0,
    )
    resp = TopicResponse.model_validate(topic)
    resp.priority_score = priority
    return resp


@router.post("/", response_model=TopicResponse, status_code=201)
async def create_topic(
    body: TopicCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a topic for an exam."""
    # Verify exam belongs to user
    result = await db.execute(
        select(Exam).where(Exam.id == body.exam_id, Exam.user_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Exam not found")

    topic = Topic(**body.model_dump())
    db.add(topic)
    await db.flush()
    await db.refresh(topic)

    await invalidate_user_cache(str(user.id))
    return _enrich_topic(topic)


@router.get("/exam/{exam_id}", response_model=list[TopicResponse])
async def get_topics_for_exam(
    exam_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all topics for a specific exam."""
    # Verify exam belongs to user
    result = await db.execute(
        select(Exam).where(Exam.id == exam_id, Exam.user_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Exam not found")

    result = await db.execute(select(Topic).where(Topic.exam_id == exam_id))
    topics = result.scalars().all()
    return [_enrich_topic(t) for t in topics]


@router.put("/{topic_id}", response_model=TopicResponse)
async def update_topic(
    topic_id: UUID,
    body: TopicUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a topic."""
    result = await db.execute(
        select(Topic)
        .join(Exam)
        .where(Topic.id == topic_id, Exam.user_id == user.id)
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(topic, key, value)

    await db.flush()
    await db.refresh(topic)

    await invalidate_user_cache(str(user.id))
    return _enrich_topic(topic)


@router.put("/{topic_id}/progress", response_model=TopicResponse)
async def update_progress(
    topic_id: UUID,
    body: TopicProgressUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update topic completion percentage."""
    result = await db.execute(
        select(Topic)
        .join(Exam)
        .where(Topic.id == topic_id, Exam.user_id == user.id)
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    topic.completion_percent = body.completion_percent
    topic.is_completed = body.completion_percent >= 100.0

    await db.flush()
    await db.refresh(topic)

    await invalidate_user_cache(str(user.id))
    return _enrich_topic(topic)


@router.delete("/{topic_id}", status_code=204)
async def delete_topic(
    topic_id: UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a topic."""
    result = await db.execute(
        select(Topic)
        .join(Exam)
        .where(Topic.id == topic_id, Exam.user_id == user.id)
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    await db.delete(topic)
    await invalidate_user_cache(str(user.id))
    return None


@router.post("/upload", response_model=list[TopicResponse], status_code=201)
async def upload_topics(
    exam_id: UUID = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload topics from a CSV, JSON, or TXT file."""
    # Verify exam belongs to user
    result = await db.execute(
        select(Exam).where(Exam.id == exam_id, Exam.user_id == user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Exam not found")

    content = await file.read()
    filename = file.filename.lower()
    topics_to_create = []

    try:
        if filename.endswith(".json"):
            data = json.loads(content.decode("utf-8"))
            if not isinstance(data, list):
                raise HTTPException(status_code=400, detail="JSON must be an array of topics")
            for item in data:
                name = item.get("name")
                if not name:
                    continue
                topics_to_create.append({
                    "exam_id": exam_id,
                    "name": str(name)[:255],
                    "difficulty_score": int(item.get("difficulty_score", 3)),
                    "weightage_percent": float(item.get("weightage_percent", 10.0)),
                    "past_score_percent": float(item.get("past_score_percent", 50.0)),
                    "estimated_hours": item.get("estimated_hours"),
                })
        elif filename.endswith(".csv"):
            text = content.decode("utf-8")
            f = io.StringIO(text)
            reader = csv.DictReader(f)
            headers = [h.strip().lower() for h in (reader.fieldnames or [])]
            
            name_key = next((h for h in headers if "name" in h), None)
            diff_key = next((h for h in headers if "diff" in h), None)
            weight_key = next((h for h in headers if "weight" in h or "percent" in h), None)
            past_key = next((h for h in headers if "past" in h or "score" in h), None)
            est_key = next((h for h in headers if "est" in h or "hour" in h), None)

            if not name_key:
                f.seek(0)
                row_reader = csv.reader(f)
                for row in row_reader:
                    if not row:
                        continue
                    name = row[0]
                    diff = int(row[1]) if len(row) > 1 else 3
                    weight = float(row[2]) if len(row) > 2 else 10.0
                    past = float(row[3]) if len(row) > 3 else 50.0
                    topics_to_create.append({
                        "exam_id": exam_id,
                        "name": str(name)[:255],
                        "difficulty_score": diff,
                        "weightage_percent": weight,
                        "past_score_percent": past,
                    })
            else:
                for row in reader:
                    row_clean = {k.strip().lower(): v for k, v in row.items() if k}
                    name = row_clean.get(name_key)
                    if not name:
                        continue
                    
                    diff = 3
                    if diff_key and row_clean.get(diff_key):
                        try:
                            diff = int(float(row_clean[diff_key]))
                        except ValueError:
                            pass
                    
                    weight = 10.0
                    if weight_key and row_clean.get(weight_key):
                        try:
                            weight = float(row_clean[weight_key])
                        except ValueError:
                            pass
                            
                    past = 50.0
                    if past_key and row_clean.get(past_key):
                        try:
                            past = float(row_clean[past_key])
                        except ValueError:
                            pass
                    
                    est = None
                    if est_key and row_clean.get(est_key):
                        try:
                            est = float(row_clean[est_key])
                        except ValueError:
                            pass

                    topics_to_create.append({
                        "exam_id": exam_id,
                        "name": str(name)[:255],
                        "difficulty_score": diff,
                        "weightage_percent": weight,
                        "past_score_percent": past,
                        "estimated_hours": est,
                    })
        else:
            text = content.decode("utf-8")
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            for line in lines:
                parts = [p.strip() for p in line.split(",")]
                name = parts[0]
                diff = 3
                weight = 10.0
                past = 50.0
                if len(parts) > 1:
                    try:
                        diff = int(parts[1])
                    except ValueError:
                        pass
                if len(parts) > 2:
                    try:
                        weight = float(parts[2])
                    except ValueError:
                        pass
                if len(parts) > 3:
                    try:
                        past = float(parts[3])
                    except ValueError:
                        pass
                
                topics_to_create.append({
                    "exam_id": exam_id,
                    "name": name[:255],
                    "difficulty_score": diff,
                    "weightage_percent": weight,
                    "past_score_percent": past,
                })

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    if not topics_to_create:
        raise HTTPException(status_code=400, detail="No topics found in the file")

    created_topics = []
    for topic_data in topics_to_create:
        topic_data["difficulty_score"] = max(1, min(5, topic_data["difficulty_score"]))
        topic_data["weightage_percent"] = max(0.0, min(100.0, topic_data["weightage_percent"]))
        topic_data["past_score_percent"] = max(0.0, min(100.0, topic_data["past_score_percent"]))
        
        topic = Topic(**topic_data)
        db.add(topic)
        created_topics.append(topic)

    await db.flush()
    for topic in created_topics:
        await db.refresh(topic)

    await invalidate_user_cache(str(user.id))
    return [_enrich_topic(t) for t in created_topics]


