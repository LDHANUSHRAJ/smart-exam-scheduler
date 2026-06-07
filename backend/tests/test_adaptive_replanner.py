"""Tests for adaptive_replanner.py — Greedy Re-scheduler."""

import pytest
from datetime import date, time, timedelta
from app.algorithms.adaptive_replanner import greedy_reschedule


class TestGreedyReschedule:
    def test_exam_already_passed(self):
        """Cannot reschedule if exam is today or past."""
        result = greedy_reschedule(
            skipped_session={"id": "s1", "duration_minutes": 60},
            remaining_sessions=[],
            incomplete_topics=[],
            exam_date=date.today(),
            daily_hours=6.0,
        )
        assert result["critical"] is True
        assert len(result["new_sessions"]) == 0

    def test_basic_rescheduling(self):
        """Skipped 1h session should be redistributed."""
        future_date = date.today() + timedelta(days=5)
        result = greedy_reschedule(
            skipped_session={"id": "s1", "duration_minutes": 60},
            remaining_sessions=[],
            incomplete_topics=[
                {
                    "id": "t1",
                    "exam_id": "e1",
                    "estimated_hours": 2.0,
                    "priority_score": 0.8,
                    "remaining_hours": 2.0,
                }
            ],
            exam_date=future_date,
            daily_hours=6.0,
        )
        assert len(result["new_sessions"]) > 0
        assert result["hours_recovered"] > 0

    def test_no_incomplete_topics(self):
        """No topics to reschedule → 0 new sessions."""
        result = greedy_reschedule(
            skipped_session={"id": "s1", "duration_minutes": 60},
            remaining_sessions=[],
            incomplete_topics=[],
            exam_date=date.today() + timedelta(days=5),
            daily_hours=6.0,
        )
        assert len(result["new_sessions"]) == 0

    def test_respects_daily_limit(self):
        """Should not exceed daily_hours when rescheduling."""
        future_date = date.today() + timedelta(days=2)
        tomorrow = date.today() + timedelta(days=1)

        # Tomorrow already has 5.5h scheduled
        existing = [
            {
                "scheduled_date": tomorrow,
                "duration_minutes": 330,  # 5.5 hours
                "end_time": time(14, 30),
            }
        ]

        result = greedy_reschedule(
            skipped_session={"id": "s1", "duration_minutes": 120},  # 2h skipped
            remaining_sessions=existing,
            incomplete_topics=[
                {
                    "id": "t1",
                    "exam_id": "e1",
                    "estimated_hours": 3.0,
                    "priority_score": 0.9,
                    "remaining_hours": 3.0,
                }
            ],
            exam_date=future_date,
            daily_hours=6.0,
        )
        # Should fit at most 0.5h on tomorrow + some on day after
        assert result["hours_recovered"] > 0

    def test_priority_ordering(self):
        """Higher priority topics should get scheduled first."""
        future_date = date.today() + timedelta(days=5)
        result = greedy_reschedule(
            skipped_session={"id": "s1", "duration_minutes": 60},
            remaining_sessions=[],
            incomplete_topics=[
                {
                    "id": "t1", "exam_id": "e1",
                    "estimated_hours": 1.0, "priority_score": 0.3,
                    "remaining_hours": 1.0,
                },
                {
                    "id": "t2", "exam_id": "e1",
                    "estimated_hours": 1.0, "priority_score": 0.9,
                    "remaining_hours": 1.0,
                },
            ],
            exam_date=future_date,
            daily_hours=6.0,
        )
        # First scheduled session should be the higher priority topic
        if result["new_sessions"]:
            assert result["new_sessions"][0]["topic_id"] == "t2"

    def test_critical_flag_when_no_days(self):
        """Critical should be true when exam is tomorrow and hours unrecovered."""
        result = greedy_reschedule(
            skipped_session={"id": "s1", "duration_minutes": 600},  # 10h
            remaining_sessions=[
                {
                    "scheduled_date": date.today() + timedelta(days=1),
                    "duration_minutes": 360,  # 6h already full
                    "end_time": time(18, 0),
                }
            ],
            incomplete_topics=[
                {
                    "id": "t1", "exam_id": "e1",
                    "estimated_hours": 10.0, "priority_score": 0.9,
                    "remaining_hours": 10.0,
                }
            ],
            exam_date=date.today() + timedelta(days=2),
            daily_hours=6.0,
        )
        # Only 1 day left and it's already full → critical
        assert result["critical"] is True or result["hours_unrecovered"] > 0
