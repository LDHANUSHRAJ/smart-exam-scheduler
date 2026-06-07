"""
Plan Generator — Orchestrator

Orchestrates the full plan generation pipeline:

1. Call detect_conflicts(exams) → get color_assignment, conflict_pairs
2. For each exam, compute topic priority scores
3. Call generate_daily_allocations(topics, daily_hours, start_date, constraints)
   which internally calls knapsack_allocate per day
4. Persist study_plan and study_sessions to DB
5. Cache the daily view in Redis with key: plan:{user_id}:{date}

PIPELINE:
  Input exams + topics + constraints
       ↓
  detect_conflicts()           → conflict graph + groups
       ↓
  compute_priority_scores()    → priority per topic
       ↓
  generate_daily_allocations() → knapsack per day
       ↓
  return structured plan
"""

from datetime import date, time, timedelta
from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4

from app.algorithms.conflict_detector import detect_conflicts, get_color_hex
from app.algorithms.study_allocator import (
    TopicItem,
    compute_priority_score,
    generate_daily_allocations,
)


class PlanGenerator:
    """Orchestrates conflict detection → priority scoring → knapsack allocation."""

    def __init__(
        self,
        exams: List[dict],
        topics: List[dict],
        daily_hours: float = 6.0,
        sleep_start_hour: int = 22,
        sleep_end_hour: int = 6,
        buffer_days: int = 1,
        include_weekends: bool = True,
    ):
        self.exams = exams
        self.topics = topics
        self.daily_hours = daily_hours
        self.sleep_start_hour = sleep_start_hour
        self.sleep_end_hour = sleep_end_hour
        self.buffer_days = buffer_days
        self.include_weekends = include_weekends

    def generate(self, start_date: date) -> Dict[str, Any]:
        """
        Run the full plan generation pipeline.
        
        Returns a dict with:
          - conflict_summary
          - sessions_by_date
          - total_study_hours
          - warnings
          - valid_from / valid_until
        """
        # Step 1: Detect conflicts
        exam_dicts = [
            {"id": str(e["id"]), "subject_name": e["subject_name"], "exam_date": e["exam_date"]}
            for e in self.exams
        ]
        conflict_result = detect_conflicts(exam_dicts)

        # Build color map: exam_id → hex color
        color_map = conflict_result.get("color_hex_map", {})

        # Build exam lookup
        exam_lookup = {str(e["id"]): e for e in self.exams}

        # Step 2: Compute priority scores and build TopicItems
        topic_items: List[TopicItem] = []
        for t in self.topics:
            exam = exam_lookup.get(str(t["exam_id"]))
            if not exam:
                continue
            exam_date = exam["exam_date"]
            days_until = (exam_date - start_date).days
            if days_until < 0:
                continue  # Exam already passed

            priority = compute_priority_score(
                weightage_percent=t.get("weightage_percent", 50.0),
                difficulty_score=t.get("difficulty_score", 3),
                past_score_percent=t.get("past_score_percent", 50.0),
            )

            topic_items.append(
                TopicItem(
                    id=str(t["id"]),
                    name=t["name"],
                    exam_id=str(t["exam_id"]),
                    exam_subject=exam["subject_name"],
                    exam_date=exam_date,
                    estimated_hours=t.get("estimated_hours", 2.0),
                    weightage_percent=t.get("weightage_percent", 50.0),
                    difficulty_score=t.get("difficulty_score", 3),
                    past_score_percent=t.get("past_score_percent", 50.0),
                    priority_score=priority,
                    days_until_exam=days_until,
                    completion_percent=t.get("completion_percent", 0.0),
                    color_code=color_map.get(str(t["exam_id"]), "#6366f1"),
                )
            )

        if not topic_items:
            return {
                "conflict_summary": conflict_result,
                "sessions_by_date": {},
                "total_study_hours": 0.0,
                "total_sessions": 0,
                "warnings": ["No topics to schedule. Add topics to your exams first."],
                "valid_from": start_date,
                "valid_until": start_date,
            }

        # Step 3: Determine end date (last exam date)
        end_date = max(t.exam_date for t in topic_items)

        # Step 4: Generate daily allocations using knapsack per day
        daily_plans = generate_daily_allocations(
            topics=topic_items,
            daily_hours=self.daily_hours,
            start_date=start_date,
            end_date=end_date,
            sleep_start_hour=self.sleep_start_hour,
            sleep_end_hour=self.sleep_end_hour,
            buffer_days=self.buffer_days,
            include_weekends=self.include_weekends,
        )

        # Step 5: Structure result
        sessions_by_date: Dict[str, List[dict]] = {}
        total_hours = 0.0
        total_sessions = 0

        for day_plan in daily_plans:
            date_str = day_plan["date"].isoformat()
            sessions_by_date[date_str] = []

            for s in day_plan["sessions"]:
                session = {
                    "id": str(uuid4()),
                    "topic_id": s["topic_id"],
                    "exam_id": s["exam_id"],
                    "topic_name": s["topic_name"],
                    "exam_subject": s["exam_subject"],
                    "scheduled_date": day_plan["date"],
                    "start_time": s["start_time"],
                    "end_time": s["end_time"],
                    "duration_minutes": s["duration_minutes"],
                    "priority_score": s["priority_score"],
                    "color_code": s["color_code"],
                    "status": "pending",
                }
                sessions_by_date[date_str].append(session)
                total_sessions += 1

            total_hours += day_plan["total_hours"]

        # Step 6: Generate warnings
        warnings = []
        if conflict_result["total_conflicts"] > 0:
            warnings.append(
                f"{conflict_result['total_conflicts']} exam conflict(s) detected — "
                f"{conflict_result['chromatic_number']} conflict groups identified."
            )
        for pair in conflict_result["conflict_pairs"]:
            if pair["conflict_type"] == "same_day":
                warnings.append(
                    f"⚠ Two exams on the same day! High conflict detected."
                )

        if total_hours > (end_date - start_date).days * self.daily_hours:
            warnings.append(
                "⚠ Study plan exceeds available time. Some topics may be deferred."
            )

        return {
            "conflict_summary": conflict_result,
            "sessions_by_date": sessions_by_date,
            "total_study_hours": round(total_hours, 1),
            "total_sessions": total_sessions,
            "warnings": warnings,
            "valid_from": start_date,
            "valid_until": end_date,
        }
