"""Tests for conflict_detector.py — Welsh-Powell Graph Coloring."""

import pytest
from datetime import date, timedelta
from app.algorithms.conflict_detector import (
    build_exam_conflict_graph,
    welsh_powell_coloring,
    detect_conflicts,
)


def make_exam(id: str, name: str, exam_date: date):
    return {"id": id, "subject_name": name, "exam_date": exam_date}


class TestBuildExamConflictGraph:
    def test_no_conflicts_when_exams_far_apart(self):
        exams = [
            make_exam("1", "Math", date(2026, 7, 1)),
            make_exam("2", "Physics", date(2026, 7, 10)),
        ]
        G = build_exam_conflict_graph(exams)
        assert len(G.edges()) == 0

    def test_same_day_conflict(self):
        exams = [
            make_exam("1", "Math", date(2026, 7, 1)),
            make_exam("2", "Physics", date(2026, 7, 1)),
        ]
        G = build_exam_conflict_graph(exams)
        assert len(G.edges()) == 1
        assert G["1"]["2"]["conflict_type"] == "same_day"

    def test_close_day_conflict(self):
        exams = [
            make_exam("1", "Math", date(2026, 7, 1)),
            make_exam("2", "Physics", date(2026, 7, 2)),
        ]
        G = build_exam_conflict_graph(exams)
        assert len(G.edges()) == 1
        assert G["1"]["2"]["conflict_type"] == "too_close"

    def test_three_exams_same_day(self):
        exams = [
            make_exam("1", "Math", date(2026, 7, 1)),
            make_exam("2", "Physics", date(2026, 7, 1)),
            make_exam("3", "Chemistry", date(2026, 7, 1)),
        ]
        G = build_exam_conflict_graph(exams)
        assert len(G.edges()) == 3  # All pairs conflict


class TestWelshPowellColoring:
    def test_no_edges_single_color(self):
        exams = [
            make_exam("1", "Math", date(2026, 7, 1)),
            make_exam("2", "Physics", date(2026, 7, 15)),
        ]
        G = build_exam_conflict_graph(exams)
        colors = welsh_powell_coloring(G)
        assert len(set(colors.values())) == 1  # All same color (no conflicts)

    def test_two_conflicts_need_two_colors(self):
        exams = [
            make_exam("1", "Math", date(2026, 7, 1)),
            make_exam("2", "Physics", date(2026, 7, 1)),
        ]
        G = build_exam_conflict_graph(exams)
        colors = welsh_powell_coloring(G)
        assert colors["1"] != colors["2"]

    def test_triangle_needs_three_colors(self):
        exams = [
            make_exam("1", "Math", date(2026, 7, 1)),
            make_exam("2", "Physics", date(2026, 7, 1)),
            make_exam("3", "Chemistry", date(2026, 7, 1)),
        ]
        G = build_exam_conflict_graph(exams)
        colors = welsh_powell_coloring(G)
        assert len(set(colors.values())) == 3


class TestDetectConflicts:
    def test_empty_exams(self):
        result = detect_conflicts([])
        assert result["total_exams"] == 0
        assert result["total_conflicts"] == 0

    def test_full_analysis(self):
        exams = [
            make_exam("1", "Math", date(2026, 7, 1)),
            make_exam("2", "Physics", date(2026, 7, 2)),
            make_exam("3", "Chemistry", date(2026, 7, 10)),
            make_exam("4", "Biology", date(2026, 7, 11)),
        ]
        result = detect_conflicts(exams)
        assert result["total_exams"] == 4
        assert result["total_conflicts"] == 2  # (1,2) and (3,4)
        assert result["chromatic_number"] == 2
        assert "color_hex_map" in result

    def test_no_conflicts_returns_one_group(self):
        exams = [
            make_exam("1", "Math", date(2026, 7, 1)),
            make_exam("2", "Physics", date(2026, 7, 15)),
        ]
        result = detect_conflicts(exams)
        assert result["total_conflicts"] == 0
        assert result["chromatic_number"] == 1
