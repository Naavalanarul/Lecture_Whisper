"""Unit tests for deterministic date resolution (A1)."""

from datetime import UTC, datetime, timezone
import pytest
from lecturewhisper.pipeline.events import EventExtractor


def test_relative_date_resolves_against_recording_started_at():
    """Relative dates must resolve against recording started_at in UTC, not current host time."""
    # 2026-10-05 is a Monday
    base_dt = datetime(2026, 10, 5, 9, 0, 0, tzinfo=UTC)

    # Tomorrow from Monday Oct 5 -> Tuesday Oct 6
    res = EventExtractor.resolve_date("homework due tomorrow", base_datetime=base_dt)
    assert res["resolved"] is True
    assert res["date_iso"] == "2026-10-06"
    assert res["needs_review"] is False

    # In two weeks from Oct 5 -> Oct 19
    res_2w = EventExtractor.resolve_date("project due in two weeks", base_datetime=base_dt)
    assert res_2w["resolved"] is True
    assert res_2w["date_iso"] == "2026-10-19"


def test_timezone_defaults_to_utc():
    """If base_datetime lacks timezone info, it must be treated as UTC."""
    naive_dt = datetime(2026, 10, 5, 9, 0, 0)
    res = EventExtractor.resolve_date("quiz tomorrow", base_datetime=naive_dt)
    assert res["resolved"] is True
    assert res["date_iso"] == "2026-10-06"


def test_next_weekday_ambiguity_returns_both_candidates():
    """
    When the weekday is ambiguous (e.g., lecture is on Monday and speaker says 'next Monday'
    or 'on Monday'), return both candidates with needs_review: true.
    """
    # 2026-10-05 is a Monday
    base_dt = datetime(2026, 10, 5, 10, 0, 0, tzinfo=UTC)

    res = EventExtractor.resolve_date("assignment due next Monday", base_datetime=base_dt)
    assert res["needs_review"] is True
    assert "candidate_dates" in res
    assert len(res["candidate_dates"]) == 2
    assert "2026-10-05" in res["candidate_dates"]
    assert "2026-10-12" in res["candidate_dates"]


def test_date_only_does_not_invent_fake_spoken_times():
    """Date-only mentions must NOT fabricate spoken times."""
    base_dt = datetime(2026, 10, 5, 10, 0, 0, tzinfo=UTC)

    # Date-only mention
    res = EventExtractor.resolve_date("midterm will be held on November 12th in the main auditorium", base_datetime=base_dt)
    assert res["resolved"] is True
    assert res["date_iso"] == "2026-11-12"  # Just date, no fake time

    # Time explicitly stated
    res_time = EventExtractor.resolve_date("assignment 3 deadline is next Friday at 11:59 PM", base_datetime=base_dt)
    assert res_time["resolved"] is True
    assert "23:59:00" in res_time["date_iso"] or "11:59" in res_time["date_text"]


def test_next_friday_spoken_on_monday_resolves_to_following_week_with_candidates():
    """
    On Monday, 'this Friday' is +4 days, but 'next Friday' refers to Friday of the next week (+11 days).
    Because some speakers colloquialise 'next Friday' to mean this coming Friday,
    it must return needs_review: True with both candidates, defaulting date_iso to the following week.
    """
    # 2026-10-05 is a Monday
    base_dt = datetime(2026, 10, 5, 14, 30, 0, tzinfo=UTC)

    # 1. "this Friday" on Monday -> this coming Friday (2026-10-09)
    res_this = EventExtractor.resolve_date("homework due this Friday", base_datetime=base_dt)
    assert res_this["resolved"] is True
    assert res_this["date_iso"] == "2026-10-09"
    assert res_this["needs_review"] is False

    # 2. "next Friday" on Monday -> following week Friday (2026-10-16), needs review with candidates
    res_next = EventExtractor.resolve_date("assignment 3 is due next Friday", base_datetime=base_dt)
    assert res_next["resolved"] is True
    assert res_next["date_iso"] == "2026-10-16"
    assert res_next["needs_review"] is True
    assert "candidate_dates" in res_next
    assert "2026-10-09" in res_next["candidate_dates"]
    assert "2026-10-16" in res_next["candidate_dates"]


def test_date_only_never_reuses_recording_time_of_day():
    """
    Date-only events must NOT reuse the recording's hour/minute (e.g. 14:30).
    The date_iso must strictly be YYYY-MM-DD.
    """
    base_dt = datetime(2026, 10, 5, 14, 30, 0, tzinfo=UTC)

    res = EventExtractor.resolve_date(
        "The midterm exam will take place in three weeks during regular class hours.",
        base_datetime=base_dt,
    )
    assert res["resolved"] is True
    assert res["date_iso"] == "2026-10-26"
    assert "T" not in res["date_iso"]
    assert "14:30" not in str(res.get("date_iso"))

