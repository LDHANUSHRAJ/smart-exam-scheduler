"""
ALGORITHM: Welsh-Powell Graph Coloring for Exam Conflict Detection

LOGIC:
1. Build a graph G where:
   - Each node = one exam
   - Add an edge between exam A and exam B if:
     a) They are on the same day, OR
     b) They are within CONFLICT_THRESHOLD_DAYS (default: 2 days) of each other

2. Sort nodes by degree (descending) — Welsh-Powell heuristic

3. Greedily assign colors (conflict groups):
   - For each node in sorted order, assign the smallest color not used by neighbors
   - This gives the chromatic coloring

4. Return:
   - conflict_graph: NetworkX Graph object
   - color_assignment: dict { exam_id -> color_int }
   - conflict_pairs: list of (exam_a, exam_b, days_apart)
   - chromatic_number: int (number of distinct groups)

COMPLEXITY: O(V² + E) where V = number of exams, E = number of conflict edges

INTERVIEW ANSWER: We use Welsh-Powell because it's a greedy approximation that
works well for sparse graphs (student exam schedules rarely have >15 exams).
Exact chromatic number is NP-hard, so approximation is justified here.
"""

import networkx as nx
from datetime import date
from typing import Dict, List, Any

CONFLICT_THRESHOLD_DAYS = 2

# Fixed palette for conflict group coloring
CONFLICT_COLORS = [
    "#6366f1",  # indigo
    "#f43f5e",  # rose
    "#10b981",  # emerald
    "#f59e0b",  # amber
    "#8b5cf6",  # violet
    "#06b6d4",  # cyan
    "#ec4899",  # pink
    "#84cc16",  # lime
    "#ef4444",  # red
    "#3b82f6",  # blue
]


def build_exam_conflict_graph(exams: List[dict]) -> nx.Graph:
    """
    Build adjacency graph from list of exam dicts.
    Each exam dict: { id, subject_name, exam_date }
    """
    G = nx.Graph()
    for exam in exams:
        G.add_node(exam["id"], **exam)

    for i in range(len(exams)):
        for j in range(i + 1, len(exams)):
            a, b = exams[i], exams[j]
            days_apart = abs((a["exam_date"] - b["exam_date"]).days)
            if days_apart <= CONFLICT_THRESHOLD_DAYS:
                conflict_type = "same_day" if days_apart == 0 else "too_close"
                G.add_edge(
                    a["id"],
                    b["id"],
                    days_apart=days_apart,
                    conflict_type=conflict_type,
                )
    return G


def welsh_powell_coloring(G: nx.Graph) -> Dict[str, int]:
    """
    Welsh-Powell greedy graph coloring.
    Returns dict: { node_id -> color_int }
    """
    sorted_nodes = sorted(G.nodes(), key=lambda n: G.degree(n), reverse=True)
    colors: Dict[str, int] = {}

    for node in sorted_nodes:
        neighbor_colors = {colors[nbr] for nbr in G.neighbors(node) if nbr in colors}
        color = 0
        while color in neighbor_colors:
            color += 1
        colors[node] = color

    return colors


def get_color_hex(color_int: int) -> str:
    """Map a conflict group integer to a hex color from the palette."""
    return CONFLICT_COLORS[color_int % len(CONFLICT_COLORS)]


def detect_conflicts(exams: List[dict]) -> dict:
    """
    Main entry point. Returns full conflict analysis.
    
    Args:
        exams: List of dicts with keys: id, subject_name, exam_date
        
    Returns:
        Dictionary with color_assignment, conflict_pairs, chromatic_number,
        color_hex_map, total_exams, total_conflicts
    """
    if not exams:
        return {
            "color_assignment": {},
            "conflict_pairs": [],
            "chromatic_number": 0,
            "color_hex_map": {},
            "total_exams": 0,
            "total_conflicts": 0,
        }

    G = build_exam_conflict_graph(exams)
    color_assignment = welsh_powell_coloring(G)

    # Map color ints to hex colors
    color_hex_map = {
        exam_id: get_color_hex(color_int)
        for exam_id, color_int in color_assignment.items()
    }

    conflict_pairs = [
        {
            "exam_a": str(u),
            "exam_b": str(v),
            "days_apart": G[u][v]["days_apart"],
            "conflict_type": G[u][v]["conflict_type"],
        }
        for u, v in G.edges()
    ]

    chromatic_number = max(color_assignment.values(), default=-1) + 1

    return {
        "color_assignment": {str(k): v for k, v in color_assignment.items()},
        "conflict_pairs": conflict_pairs,
        "chromatic_number": chromatic_number,
        "color_hex_map": {str(k): v for k, v in color_hex_map.items()},
        "total_exams": len(exams),
        "total_conflicts": len(conflict_pairs),
    }
