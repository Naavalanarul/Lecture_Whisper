"""Tests for Phase 2 offline audio pipeline."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

# Ensure monorepo root is on sys.path for eval/ fixtures
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import pytest

from eval.wer import compute_wer, normalize_text
from lecturewhisper.api.schemas import Transcript, TranscriptSegment, Word
from lecturewhisper.pipeline.asr import HallucinationGuard, MLXWhisperASR
from lecturewhisper.pipeline.audio import get_audio_duration, normalize_to_wav
from lecturewhisper.pipeline.diarize import MockDiarizer, SpeakerTurn, align_speakers_to_transcript
from lecturewhisper.pipeline.runner import PipelineRunner
from lecturewhisper.pipeline.speakers import SpeakerAnalyzer
from lecturewhisper.pipeline.vad import EnergyVAD, SileroVAD

SAMPLE_WAV = Path(__file__).parent.parent.parent / "samples" / "synthetic_sample.wav"


def test_audio_probe_and_normalize(tmp_path: Path) -> None:
    """ffmpeg should accurately probe duration and normalize to 16kHz mono WAV."""
    assert SAMPLE_WAV.exists()
    duration = get_audio_duration(SAMPLE_WAV)
    assert 2.9 <= duration <= 3.1

    out_wav = tmp_path / "normalized.wav"
    norm_res = normalize_to_wav(SAMPLE_WAV, output_path=out_wav)
    assert norm_res.exists()
    assert norm_res.stat().st_size > 0

    norm_dur = get_audio_duration(norm_res)
    assert 2.9 <= norm_dur <= 3.1


def test_vad_speech_detection() -> None:
    """VAD should detect speech segments in the synthetic audio."""
    energy_vad = EnergyVAD()
    segments = energy_vad.detect_speech(SAMPLE_WAV)
    assert len(segments) >= 1
    # Tone was between 0.5s and 2.5s
    first = segments[0]
    assert first.start >= 0.0
    assert first.end <= 3.1

    silero = SileroVAD()
    s_segs = silero.detect_speech(SAMPLE_WAV)
    assert len(s_segs) >= 1
    silero.unload()


def test_hallucination_guard() -> None:
    """HallucinationGuard should remove YouTube artifacts and repetitive loops."""
    # Substring matches
    assert HallucinationGuard.is_hallucination_phrase("Thank you for watching!")
    assert HallucinationGuard.is_hallucination_phrase("Please like and subscribe")
    assert HallucinationGuard.is_hallucination_phrase("[Music]")
    assert not HallucinationGuard.is_hallucination_phrase("Today we explore differential equations.")

    # Repetition loop
    assert HallucinationGuard.has_repetition_loop("and and and and and and and")
    assert not HallucinationGuard.has_repetition_loop("The algorithm calculates gradient descent step by step.")

    # Segment filtering
    bad_seg = TranscriptSegment(
        start=0.0, end=2.0, speaker="SPEAKER_00", text="Thank you for watching.", words=[]
    )
    good_seg = TranscriptSegment(
        start=2.0, end=5.0, speaker="SPEAKER_00", text="Let's open page 42 of the textbook.", words=[]
    )
    clean = HallucinationGuard.filter_segments([bad_seg, good_seg])
    assert len(clean) == 1
    assert clean[0].text == "Let's open page 42 of the textbook."


def test_diarization_and_speaker_alignment() -> None:
    """Diarization turns should align to transcript segments by maximum temporal overlap."""
    words = [Word(w="Hello", start=1.0, end=2.0, conf=0.99)]
    seg1 = TranscriptSegment(start=0.0, end=5.0, speaker="SPEAKER_00", text="Segment 1", words=words)
    seg2 = TranscriptSegment(start=5.0, end=10.0, speaker="SPEAKER_00", text="Segment 2", words=words)
    transcript = Transcript(segments=[seg1, seg2], asr_model="test", language="en")

    turns = [
        SpeakerTurn(speaker="LECTURER_A", start=0.0, end=6.0),
        SpeakerTurn(speaker="STUDENT_B", start=6.0, end=10.0),
    ]

    aligned = align_speakers_to_transcript(transcript, turns)
    assert aligned.segments[0].speaker == "LECTURER_A"
    assert aligned.segments[1].speaker == "STUDENT_B"


def test_speaker_analyzer() -> None:
    """SpeakerAnalyzer should identify lecturer by talk time and support voiceprint."""
    seg1 = TranscriptSegment(start=0.0, end=40.0, speaker="PROF_DOE", text="Long lecture part", words=[])
    seg2 = TranscriptSegment(start=40.0, end=50.0, speaker="STUDENT", text="A question", words=[])
    transcript = Transcript(segments=[seg1, seg2], asr_model="test", language="en")

    stats = SpeakerAnalyzer.identify_lecturer(transcript)
    assert len(stats.speakers) == 2
    lecturer = next(s for s in stats.speakers if s.is_lecturer)
    assert lecturer.id == "PROF_DOE"
    assert lecturer.method == "talk_time"
    assert lecturer.share == 0.8


def test_pipeline_runner_end_to_end() -> None:
    """PipelineRunner should complete sequentially and return full PipelineResult."""
    words = [Word(w="Testing", start=0.0, end=1.0, conf=0.99)]
    seg = TranscriptSegment(start=0.0, end=1.5, speaker="SPEAKER_00", text="Testing pipeline runner.", words=words)
    mock_t = Transcript(segments=[seg], asr_model="mock-whisper", language="en")

    with patch.object(MLXWhisperASR, "transcribe", return_value=mock_t):
        runner = PipelineRunner()
        result = runner.process(SAMPLE_WAV)

        assert result.duration_s > 0
        assert result.transcript is not None
        assert len(result.speaker_stats.speakers) >= 1
        assert "normalize" in result.timings
        assert "vad" in result.timings
        assert "asr" in result.timings
        assert "diarize" in result.timings
        assert "speaker_stats" in result.timings


def test_wer_computation() -> None:
    """compute_wer should calculate exact WER and word counts."""
    ref = "the quick brown fox jumps over the lazy dog"
    hyp_exact = "the quick brown fox jumps over the lazy dog"
    res_exact = compute_wer(hyp_exact, ref)
    assert res_exact["wer"] == 0.0
    assert res_exact["correct"] == 9

    # 1 substitution ("cat" instead of "dog"), 1 insertion ("very")
    hyp_sub_ins = "the quick brown fox jumps over the lazy cat very"
    res_sub_ins = compute_wer(hyp_sub_ins, ref)
    assert res_sub_ins["substitutions"] == 1
    assert res_sub_ins["insertions"] == 1
    assert res_sub_ins["wer"] == round(2 / 9, 4)
