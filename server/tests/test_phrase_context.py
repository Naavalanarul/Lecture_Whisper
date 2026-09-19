"""Unit tests for Real Transcript Context for Repeated Phrases (A4)."""

import pytest
from lecturewhisper.api.schemas import Transcript, TranscriptSegment
from lecturewhisper.pipeline.phrases import PhraseAnalyzer


def test_real_transcript_context_and_timing_metrics():
    """Phrases must have real context snippets from transcript, unique descriptions, and arrival metrics."""
    transcript = Transcript(
        asr_model="test",
        language="en",
        segments=[
            TranscriptSegment(start=10.0, end=15.0, speaker="PROF", text="Okay so, dynamic programming is essential.", words=[]),
            TranscriptSegment(start=30.0, end=35.0, speaker="PROF", text="Optimal substructure is key to dynamic programming.", words=[]),
            TranscriptSegment(start=70.0, end=75.0, speaker="PROF", text="Okay so, dynamic programming builds solutions bottom-up.", words=[]),
        ],
    )

    phrases = PhraseAnalyzer.analyze(transcript, min_emphasis_count=2, min_habit_count=2)

    assert len(phrases.habits) >= 1
    habit = phrases.habits[0]
    assert habit.phrase == "okay so"
    assert habit.count == 2
    # Real snippet check
    assert habit.context_snippet is not None
    assert "okay so" in habit.context_snippet.lower()
    assert habit.first_occurrence_s == 10.0
    assert habit.last_occurrence_s == 70.0
    # (70 - 10) / (2 - 1) = 60.0
    assert habit.mean_inter_arrival_s == 60.0
    assert habit.description is not None

    # Check emphasis
    assert len(phrases.emphasis) >= 1
    dp_emphasis = next(e for e in phrases.emphasis if "dynamic programming" in e.phrase)
    assert dp_emphasis.context_snippet is not None
    assert "dynamic programming" in dp_emphasis.context_snippet.lower()
    assert dp_emphasis.description is not None


def test_no_duplicate_phrase_descriptions():
    """No two phrases may share the exact same description."""
    transcript = Transcript(
        asr_model="test",
        language="en",
        segments=[
            TranscriptSegment(start=5.0, end=10.0, speaker="PROF", text="You know, basically we need optimal substructure.", words=[]),
            TranscriptSegment(start=20.0, end=25.0, speaker="PROF", text="You know, basically memoization solves overlapping subproblems.", words=[]),
        ],
    )
    phrases = PhraseAnalyzer.analyze(transcript, min_emphasis_count=2, min_habit_count=2)

    all_descriptions = [h.description for h in phrases.habits if h.description] + \
                       [e.description for e in phrases.emphasis if e.description]

    assert len(all_descriptions) == len(set(all_descriptions))
