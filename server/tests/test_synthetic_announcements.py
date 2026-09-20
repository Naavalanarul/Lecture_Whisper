"""Unit test for Phase 4b: Synthetic lecture announcements benchmark."""

from datetime import datetime, timezone
import pytest

from lecturewhisper.pipeline.events import EventExtractor
from lecturewhisper.api.schemas import Transcript, TranscriptSegment


def test_synthetic_lecture_announcements_benchmark():
    """Benchmark EventExtractor against synthetic realistic lecture announcements."""
    synthetic_utterances = [
        ("Problem Set 1 is due next Friday at 5:00 PM.", "assignment_deadline", True),
        ("The midterm exam will take place on November 15th.", "exam", True),
        ("Quiz 2 will cover binary search trees.", "quiz", False),
        ("Homework 3 is due tomorrow at midnight.", "assignment_deadline", True),
        ("The guest lecture seminar is rescheduled for next Thursday.", "seminar", True),
        ("Office hours this week are moved to Thursday 2:00 PM.", "schedule_change", True),
    ]

    segments = [
        TranscriptSegment(
            start=float(i * 15),
            end=float((i + 1) * 15),
            text=text,
            speaker="PROFESSOR",
            words=[],
        )
        for i, (text, _, _) in enumerate(synthetic_utterances)
    ]

    transcript = Transcript(
        id="SYNTHETIC_BENCHMARK_001",
        segments=segments,
        language="en",
        duration=90.0,
        asr_model="mlx_whisper",
    )

    base_dt = datetime(2026, 9, 21, 10, 0, 0, tzinfo=timezone.utc)
    events = EventExtractor.find_candidates(transcript, base_datetime=base_dt)

    assert len(events) >= 5

    # Check date resolution on concrete expressions
    due_events = [e for e in events if e.type == "assignment_deadline" and "Problem Set 1" in e.title]
    assert len(due_events) == 1
    assert due_events[0].resolved is True
    assert "2026-09-25" in str(due_events[0].date_iso)

    exam_events = [e for e in events if e.type == "exam"]
    assert len(exam_events) >= 1
    assert exam_events[0].resolved is True
    assert "2026-11-15" in str(exam_events[0].date_iso)
