"""Tests for study_allocator.py — 0/1 Knapsack DP."""

import pytest
from datetime import date
from app.algorithms.study_allocator import (
    TopicItem,
    compute_priority_score,
    knapsack_allocate,
)


def make_topic(id: str, name: str, hours: float, priority: float, **kwargs) -> TopicItem:
    return TopicItem(
        id=id,
        name=name,
        exam_id="exam1",
        exam_subject="Test Exam",
        exam_date=date(2026, 7, 15),
        estimated_hours=hours,
        weightage_percent=kwargs.get("weightage_percent", 50.0),
        difficulty_score=kwargs.get("difficulty_score", 3),
        past_score_percent=kwargs.get("past_score_percent", 50.0),
        priority_score=priority,
        days_until_exam=30,
        completion_percent=kwargs.get("completion_percent", 0.0),
    )


class TestComputePriorityScore:
    def test_high_weight_hard_weak(self):
        """High weightage + hard + weak past → highest priority."""
        score = compute_priority_score(80.0, 5, 20.0)
        assert score > 0.7

    def test_low_weight_easy_strong(self):
        """Low weightage + easy + strong past → lowest priority."""
        score = compute_priority_score(10.0, 1, 95.0)
        assert score < 0.2

    def test_medium_values(self):
        score = compute_priority_score(50.0, 3, 50.0)
        assert 0.3 < score < 0.6

    def test_range(self):
        """Score should be between 0 and 1."""
        for w in [0, 50, 100]:
            for d in [1, 3, 5]:
                for p in [0, 50, 100]:
                    score = compute_priority_score(w, d, p)
                    assert 0.0 <= score <= 1.0


class TestKnapsackAllocate:
    def test_empty_topics(self):
        result = knapsack_allocate([], 6.0)
        assert len(result["selected_topics"]) == 0

    def test_zero_budget(self):
        topics = [make_topic("1", "T1", 2.0, 0.8)]
        result = knapsack_allocate(topics, 0.0)
        assert len(result["selected_topics"]) == 0

    def test_single_topic_fits(self):
        topics = [make_topic("1", "T1", 2.0, 0.8)]
        result = knapsack_allocate(topics, 6.0)
        assert len(result["selected_topics"]) == 1
        assert result["selected_topics"][0].id == "1"

    def test_selects_higher_priority(self):
        """When budget is limited, should prefer higher priority."""
        topics = [
            make_topic("1", "Low Priority", 3.0, 0.2),
            make_topic("2", "High Priority", 3.0, 0.9),
        ]
        result = knapsack_allocate(topics, 3.0)
        assert len(result["selected_topics"]) == 1
        assert result["selected_topics"][0].id == "2"

    def test_knapsack_optimal_selection(self):
        """Classic knapsack: best combination, not greedy."""
        topics = [
            make_topic("1", "T1", 4.0, 0.5),   # 4h, value 0.5
            make_topic("2", "T2", 3.0, 0.4),   # 3h, value 0.4
            make_topic("3", "T3", 3.0, 0.4),   # 3h, value 0.4
        ]
        # Budget = 6h. Greedy by value/weight would pick T1 then fail.
        # DP should pick T2 + T3 (6h, value 0.8 > 0.5)
        result = knapsack_allocate(topics, 6.0)
        selected_ids = {t.id for t in result["selected_topics"]}
        assert "2" in selected_ids and "3" in selected_ids

    def test_all_fit(self):
        topics = [
            make_topic("1", "T1", 1.0, 0.5),
            make_topic("2", "T2", 1.0, 0.6),
            make_topic("3", "T3", 1.0, 0.7),
        ]
        result = knapsack_allocate(topics, 6.0)
        assert len(result["selected_topics"]) == 3

    def test_completion_percent_reduces_weight(self):
        """50% complete topic should use half the hours."""
        topics = [
            make_topic("1", "T1", 4.0, 0.8, completion_percent=50.0),
        ]
        result = knapsack_allocate(topics, 2.0)
        # 4h * 50% = 2h remaining, fits in 2h budget
        assert len(result["selected_topics"]) == 1
