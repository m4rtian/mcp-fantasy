"""Pure, read-only analysis over an already-sanitized fantasy snapshot."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any


def build_weekly_brief(snapshot: Mapping[str, Any]) -> dict[str, Any]:
    """Return deterministic observations without mutating the input snapshot."""
    roster = _records(snapshot.get("roster"))
    available = _records(snapshot.get("available"))

    lineup = [
        {
            "player": player["name"],
            "recommendation": _lineup_signal(player),
        }
        for player in roster
    ]
    waiver_watch = [
        {
            "player": player["name"],
            "trend": player.get("usage_trend", "unknown"),
        }
        for player in available
        if player.get("usage_trend") == "rising"
    ]

    return {
        "week": snapshot.get("week"),
        "lineup": lineup,
        "waiver_watch": waiver_watch,
        "safety": "advisory-only; no transaction or lineup mutation is available",
    }


def _records(value: Any) -> Sequence[Mapping[str, Any]]:
    if not isinstance(value, list) or not all(isinstance(item, dict) for item in value):
        raise ValueError("roster and available values must be lists of records")
    return value


def _lineup_signal(player: Mapping[str, Any]) -> str:
    if player.get("injury_status") not in (None, "healthy"):
        return "monitor availability"
    if player.get("matchup_rating", 0) >= 4 and player.get("opportunity", 0) >= 4:
        return "strong start consideration"
    return "compare alternatives"
