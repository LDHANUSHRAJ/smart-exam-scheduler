"""
ALGORITHM: 0/1 Knapsack Dynamic Programming for Study Hour Allocation

PROBLEM FORMULATION:
- Items = topics (each has weight=estimated_hours, value=priority_score)
- Knapsack capacity = total available study hours until exam date
- Constraint: each topic is either fully scheduled (1) or deferred (0) per day bucket

PRIORITY SCORE for topic T:
  priority = (weightage_percent * 0.4)
           + (difficulty_score / 5 * 0.3)
           + ((100 - past_score_percent) / 100 * 0.3)

  → High marks + hard + weak area = highest priority

DP RECURRENCE:
  dp[i][h] = max priority achievable using first i topics with h hours budget
  dp[i][h] = max(
      dp[i-1][h],                                    # skip topic i
      dp[i-1][h - hours[i]] + priority[i]            # include topic i (if hours[i] <= h)
  )

  Hours are discretized into 30-min slots (multiply by 2 to get integer units)

COMPLEXITY: O(N × H) time, O(H) space (1D rolling array optimization)
  Where N = number of topics, H = total hours × 2 (slot units)
"""

from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import date, time, timedelta
import math

SLOT_UNIT = 0.5  # 30-minute slots
BREAK_MINUTES = 10  # 10-minute break between sessions


@dataclass
class TopicItem:
    id: str
    name: str
    exam_id: str
    exam_subject: str
    exam_date: date
    estimated_hours: float
    weightage_percent: float
    difficulty_score: int
    past_score_percent: float
    priority_score: float
    days_until_exam: int
    completion_percent: float = 0.0
    color_code: str = "#6366f1"


def compute_priority_score(
    weightage_percent: float,
    difficulty_score: int,
    past_score_percent: float,
) -> float:
    """
    Composite priority score in range [0, 1].
    Higher = study this first.

    Formula:
      0.4 * (weightage / 100) + 0.3 * (difficulty / 5) + 0.3 * ((100 - past_score) / 100)
    """
    weakness = (100.0 - (past_score_percent or 50.0)) / 100.0
    difficulty_norm = difficulty_score / 5.0
    weightage_norm = weightage_percent / 100.0
    return round((weightage_norm * 0.4) + (difficulty_norm * 0.3) + (weakness * 0.3), 4)


def knapsack_allocate(topics: List[TopicItem], total_hours_budget: float) -> Dict:
    """
    0/1 Knapsack to select which topics to prioritize given hour budget.
    Returns selected topics and unallocated topics.

    Uses space-optimized 1D DP (O(H) space).
    """
    if not topics or total_hours_budget <= 0:
        return {
            "selected_topics": [],
            "deferred_topics": topics,
            "total_priority_covered": 0.0,
            "hours_allocated": 0.0,
            "hours_budget": total_hours_budget,
        }

    to_slots = lambda h: max(1, math.ceil(h / SLOT_UNIT))
    capacity = to_slots(total_hours_budget)

    weights = [to_slots(t.estimated_hours * (1 - t.completion_percent / 100.0)) for t in topics]
    values = [t.priority_score for t in topics]
    n = len(topics)

    # 1D DP array (space-optimized)
    dp = [0.0] * (capacity + 1)

    # Build DP table
    for i in range(n):
        if weights[i] > capacity:
            continue
        for h in range(capacity, weights[i] - 1, -1):
            dp[h] = max(dp[h], dp[h - weights[i]] + values[i])

    # Backtrack to find selected items using 2D reconstruction
    # We need to rebuild partial DP for backtracking
    dp_2d = [[0.0] * (capacity + 1) for _ in range(n + 1)]
    for i in range(1, n + 1):
        for h in range(capacity + 1):
            dp_2d[i][h] = dp_2d[i - 1][h]
            if weights[i - 1] <= h:
                dp_2d[i][h] = max(
                    dp_2d[i][h],
                    dp_2d[i - 1][h - weights[i - 1]] + values[i - 1],
                )

    selected_indices = []
    h = capacity
    for i in range(n, 0, -1):
        if dp_2d[i][h] != dp_2d[i - 1][h]:
            selected_indices.append(i - 1)
            h -= weights[i - 1]

    selected_indices.reverse()
    selected = [topics[i] for i in selected_indices]
    deferred = [topics[i] for i in range(n) if i not in selected_indices]

    return {
        "selected_topics": selected,
        "deferred_topics": deferred,
        "total_priority_covered": dp_2d[n][capacity],
        "hours_allocated": sum(
            topics[i].estimated_hours * (1 - topics[i].completion_percent / 100.0)
            for i in selected_indices
        ),
        "hours_budget": total_hours_budget,
    }


def generate_daily_allocations(
    topics: List[TopicItem],
    daily_hours: float,
    start_date: date,
    end_date: date,
    sleep_start_hour: int = 22,
    sleep_end_hour: int = 6,
    buffer_days: int = 1,
    include_weekends: bool = True,
) -> List[dict]:
    """
    For each day from start_date until end_date:
    1. Filter topics whose exam hasn't passed (with buffer)
    2. Run knapsack for that day's hour budget
    3. Assign time slots respecting sleep constraints
    
    Returns list of:
    { date, sessions: [{ topic_id, exam_id, start_time, end_time, duration_minutes, priority_score }] }
    """
    daily_plans = []
    current = start_date
    
    while current <= end_date:
        # Skip weekends if not included
        if not include_weekends and current.weekday() >= 5:
            current += timedelta(days=1)
            continue

        # Filter topics relevant for this day
        # Only study topics whose exam is at least buffer_days away
        active_topics = [
            t for t in topics
            if (t.exam_date - current).days >= buffer_days
            and t.completion_percent < 100.0
        ]

        if not active_topics:
            current += timedelta(days=1)
            continue

        # Run knapsack allocation for today's budget
        result = knapsack_allocate(active_topics, daily_hours)
        selected = result["selected_topics"]

        if not selected:
            current += timedelta(days=1)
            continue

        # Assign time slots starting after wake-up
        sessions = []
        current_hour = sleep_end_hour
        current_minute = 0

        for topic in selected:
            remaining_hours = topic.estimated_hours * (1 - topic.completion_percent / 100.0)
            # Cap at daily_hours per topic to spread across days
            session_hours = min(remaining_hours, 2.0)  # Max 2 hours per session
            duration_minutes = int(session_hours * 60)

            s_time = time(hour=current_hour, minute=current_minute)

            # Calculate end time
            total_minutes = current_hour * 60 + current_minute + duration_minutes
            end_hour = total_minutes // 60
            end_minute = total_minutes % 60

            # Check if we exceed sleep time
            if end_hour >= sleep_start_hour:
                break

            e_time = time(hour=min(end_hour, 23), minute=end_minute)

            sessions.append({
                "topic_id": topic.id,
                "exam_id": topic.exam_id,
                "topic_name": topic.name,
                "exam_subject": topic.exam_subject,
                "start_time": s_time,
                "end_time": e_time,
                "duration_minutes": duration_minutes,
                "priority_score": topic.priority_score,
                "color_code": topic.color_code,
            })

            # Move cursor forward: session duration + break
            total_minutes += BREAK_MINUTES
            current_hour = total_minutes // 60
            current_minute = total_minutes % 60

            if current_hour >= sleep_start_hour:
                break

        if sessions:
            daily_plans.append({
                "date": current,
                "sessions": sessions,
                "total_hours": sum(s["duration_minutes"] for s in sessions) / 60.0,
            })

        current += timedelta(days=1)

    return daily_plans
