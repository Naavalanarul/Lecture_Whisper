"""Unit tests for Reconciled Speaker Statistics (A3)."""

import pytest
from lecturewhisper.api.schemas import Transcript, TranscriptSegment
from lecturewhisper.pipeline.speakers import SpeakerAnalyzer


def test_talk_times_sum_to_speech_and_shares_sum_to_100():
    """Speaker talk times must sum to total speech time and shares sum to exactly 1.0 (100%)."""
    transcript = Transcript(
        asr_model="test",
        language="en",
        segments=[
            TranscriptSegment(start=0.0, end=75.0, speaker="SPEAKER_00", text="Lecturing on DP...", words=[]),
            TranscriptSegment(start=76.0, end=90.0, speaker="SPEAKER_01", text="Student asking question...", words=[]),
            TranscriptSegment(start=91.0, end=100.0, speaker="SPEAKER_02", text="TA making announcement...", words=[]),
        ],
    )
    total_duration = 120.0  # 120s lecture, speech is 75 + 14 + 9 = 98s

    stats = SpeakerAnalyzer.identify_lecturer(transcript, total_duration_s=total_duration)

    assert stats.total_speech_time_s == 98.0
    assert stats.total_duration_s == 120.0
    assert stats.silence_time_s == 22.0  # 120 - 98

    # Sum of talk times must equal total speech time
    computed_sum = sum(s.talk_time_s for s in stats.speakers)
    assert abs(computed_sum - stats.total_speech_time_s) < 1e-4

    # Sum of shares must equal exactly 1.0 (100%)
    share_sum = sum(s.share for s in stats.speakers)
    assert abs(share_sum - 1.0) < 1e-4


def test_primary_lecturer_dominance_rule():
    """Dominance rule: speaker with >70% talk-time share is marked as lecturer."""
    transcript = Transcript(
        asr_model="test",
        language="en",
        segments=[
            # 80s / 100s = 80% (> 70%)
            TranscriptSegment(start=0.0, end=80.0, speaker="SPEAKER_00", text="Main lecture content", words=[]),
            # 20s / 100s = 20% (< 70%)
            TranscriptSegment(start=80.0, end=100.0, speaker="SPEAKER_01", text="Student questions", words=[]),
        ],
    )
    stats = SpeakerAnalyzer.identify_lecturer(transcript, total_duration_s=100.0)

    spk0 = next(s for s in stats.speakers if s.id == "SPEAKER_00")
    spk1 = next(s for s in stats.speakers if s.id == "SPEAKER_01")

    assert spk0.is_lecturer is True
    assert spk0.share == 0.8
    assert spk1.is_lecturer is False
    assert spk1.share == 0.2


def test_discrepancy_logging_and_metric_preservation(caplog):
    """If speech + silence does not equal total duration, log warning and preserve both metrics."""
    transcript = Transcript(
        asr_model="test",
        language="en",
        segments=[
            TranscriptSegment(start=0.0, end=50.0, speaker="SPEAKER_00", text="Content", words=[]),
        ],
    )
    # Explicitly pass conflicting duration
    stats = SpeakerAnalyzer.identify_lecturer(transcript, total_duration_s=40.0)  # speech (50s) > duration (40s)

    assert stats.total_speech_time_s == 50.0
    assert stats.total_duration_s == 40.0
    # Warning should be logged about speech exceeding duration or mismatch
    assert any("speech time" in rec.message.lower() or "duration" in rec.message.lower() for rec in caplog.records)
