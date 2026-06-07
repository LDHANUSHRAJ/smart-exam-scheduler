"""
ALGORITHM: Greedy Re-scheduling

TRIGGER: User marks a study session as 'skipped'

GREEDY STRATEGY:
1. Collect all incomplete topics for the skipped session's exam
2. Calculate remaining days until exam
3. Sort incomplete topics by priority_score DESC (greedy choice: highest value first)
4. For each remaining day (greedy):
   - Fill available slots with highest-priority incomplete topics
   - Stop when no more incomplete topics or no more days
5. Return new sessions for DB update

GREEDY JUSTIFICATION:
- Full DP re-run is O(N × H) per skip event → too expensive for real-time UX
- Greedy works here because: remaining days are few (≤14), topics are independent,
  and we just need a "good enough" reallocation
- Greedy gives O(N log N) for sort + O(N × D) for slot filling

COMPLEXITY: O(N log N + N × D) where N = topics, D = remaining days
"""

from typing import List, Dict
from datetime import date, time, timedelta


def greedy_reschedule(
    skipped_session: dict,
    remaining_sessions: List[dict],
    incomplete_topics: List[dict],
    exam_date: date,
    daily_hours: float,
    sleep_start_hour: int = 22,
    sleep_end_hour: int = 6,
) -> Dict:
    """
    Greedy redistribution of skipped session time.

    Args:
        skipped_session: The session that was skipped
        remaining_sessions: All future sessions for this exam
        incomplete_topics: Topics not yet completed for this exam
        exam_date: Date of the exam
        daily_hours: Max study hours per day
        sleep_start_hour: Hour the student goes to sleep
        sleep_end_hour: Hour the student wakes up

    Returns:
        - new_sessions: newly created sessions
        - critical: bool (True if exam is tomorrow and topics remain)
        - hours_recovered: float
        - hours_unrecovered: float
        - message: status message
    """
    today = date.today()
    days_remaining = (exam_date - today).days

    if days_remaining <= 0:
        return {
            "new_sessions": [],
            "critical": True,
            "hours_recovered": 0.0,
            "hours_unrecovered": skipped_session.get("duration_minutes", 0) / 60.0,
            "message": "Exam is today or past. Cannot reschedule.",
        }

    skipped_hours = skipped_session.get("duration_minutes", 60) / 60.0

    # Sort incomplete topics by priority descending (greedy choice)
    sorted_topics = sorted(
        incomplete_topics,
        key=lambda t: t.get("priority_score", 0),
        reverse=True,
    )

    new_sessions = []
    hours_to_distribute = skipped_hours

    for day_offset in range(1, days_remaining + 1):
        target_date = today + timedelta(days=day_offset)

        # Calculate how many hours are already scheduled on this day
        scheduled_on_day = sum(
            s.get("duration_minutes", 0) / 60.0
            for s in remaining_sessions
            if s.get("scheduled_date") == target_date
        )
        available = max(0, daily_hours - scheduled_on_day)

        if available <= 0 or not sorted_topics:
            continue

        # Find the next available start time on this day
        existing_end_times = [
            s.get("end_time", time(sleep_end_hour))
            for s in remaining_sessions
            if s.get("scheduled_date") == target_date
        ]
        if existing_end_times:
            last_end = max(existing_end_times)
            start_hour = last_end.hour
            start_minute = last_end.minute + 10  # 10-min break
            if start_minute >= 60:
                start_hour += 1
                start_minute -= 60
        else:
            start_hour = sleep_end_hour
            start_minute = 0

        # Greedily fill this day
        for topic in sorted_topics[:]:
            needed = topic.get("remaining_hours", topic.get("estimated_hours", 1.0))
            allocate = min(needed, available, hours_to_distribute)

            if allocate <= 0:
                break

            duration_minutes = int(allocate * 60)
            end_total_minutes = start_hour * 60 + start_minute + duration_minutes
            end_hour = end_total_minutes // 60
            end_minute = end_total_minutes % 60

            if end_hour >= sleep_start_hour:
                break

            new_sessions.append({
                "topic_id": topic["id"],
                "exam_id": topic.get("exam_id"),
                "scheduled_date": target_date,
                "start_time": time(start_hour, start_minute),
                "end_time": time(min(end_hour, 23), end_minute),
                "duration_minutes": duration_minutes,
                "priority_score": topic.get("priority_score", 0.5),
                "is_rescheduled": True,
                "original_skipped_session_id": skipped_session.get("id"),
            })

            available -= allocate
            hours_to_distribute -= allocate

            # Advance start time for next session
            start_hour = end_hour
            start_minute = end_minute + 10
            if start_minute >= 60:
                start_hour += 1
                start_minute -= 60

            if hours_to_distribute <= 0:
                break

        if hours_to_distribute <= 0:
            break

    hours_recovered = skipped_hours - hours_to_distribute
    return {
        "new_sessions": new_sessions,
        "hours_recovered": hours_recovered,
        "hours_unrecovered": hours_to_distribute,
        "critical": hours_to_distribute > 0 and days_remaining <= 1,
        "message": (
            f"Recovered {hours_recovered:.1f}h of {skipped_hours:.1f}h skipped."
            if hours_recovered > 0
            else "Could not recover any hours — all days are full."
        ),
    }
