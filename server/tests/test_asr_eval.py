"""
Unit tests for ASR evaluation module:
- String normalizers (strict and filler-insensitive)
- WER calculation
- Hallucination detection
- Calibration window extraction
- CSV and HTML generation
"""
from pathlib import Path
import pytest

from lecturewhisper.eval.asr import (
    calculate_wer_metrics,
    detect_hallucinations,
    extract_calibration_window,
    generate_calibration_html,
    normalize_filler_insensitive,
    normalize_strict,
    write_calibration_csv,
)
from lecturewhisper.eval.parsers import TranscriptSegment, UnifiedTranscript


def test_normalize_strict():
    raw = "Jason Ku: Welcome to 6.006, Lecture 1! It's the 1st day."
    # 1 -> one, 1st -> first
    norm = normalize_strict(raw)
    assert "jason ku" in norm
    assert "six thousand six" in norm or "six point zero zero six" in norm or "lecture one" in norm
    assert "first day" in norm
    assert "!" not in norm
    assert "'" not in norm


def test_normalize_filler_insensitive():
    raw = "Um, you know, the the algorithm is, uh, very fast."
    strict = normalize_strict(raw)
    assert "um" in strict
    assert "you know" in strict
    assert "the the" in strict

    filler = normalize_filler_insensitive(raw)
    assert "um" not in filler
    assert "uh" not in filler
    assert "you know" not in filler
    assert "the the" not in filler
    assert filler == "the algorithm is very fast"


def test_calculate_wer_metrics_exact_match():
    text = "Algorithms are fun and efficient"
    metrics = calculate_wer_metrics(text, text)
    assert metrics.strict_wer == 0.0
    assert metrics.filler_insensitive_wer == 0.0
    assert metrics.hits == 5
    assert metrics.substitutions == 0
    assert metrics.deletions == 0
    assert metrics.insertions == 0


def test_calculate_wer_metrics_fillers_only():
    ref = "The lecture starts now."
    hyp = "Um, you know, the lecture starts now."
    metrics = calculate_wer_metrics(ref, hyp)
    assert metrics.strict_wer > 0.0  # Strict penalizes 'um', 'you know'
    assert metrics.filler_insensitive_wer == 0.0  # Fillers ignored


def test_calculate_wer_metrics_empty_ref():
    metrics = calculate_wer_metrics("", "hallucinated words")
    assert metrics.strict_wer == 1.0
    assert metrics.ref_word_count == 0
    assert metrics.hyp_word_count == 2


def test_detect_hallucinations():
    clean_text = "Today we will analyze worst-case time complexity using big-O notation."
    assert detect_hallucinations(clean_text) == []

    # Repetition loop
    loop_text = "we have a problem we have a problem we have a problem and that is all."
    issues = detect_hallucinations(loop_text)
    assert len(issues) > 0
    assert any("Repetition loop" in issue for issue in issues)

    # Boilerplate artifact
    sub_text = "Please like and subscribe to our channel for more updates."
    issues_sub = detect_hallucinations(sub_text)
    assert len(issues_sub) > 0
    assert any("Boilerplate phrase" in issue for issue in issues_sub)


def test_extract_calibration_window_and_export(tmp_path):
    ref_segs = [
        TranscriptSegment(start_sec=10.0, end_sec=15.0, text="Welcome students.", speaker="PROF"),
        TranscriptSegment(start_sec=16.0, end_sec=22.0, text="Today we discuss data structures.", speaker="PROF"),
        TranscriptSegment(start_sec=400.0, end_sec=405.0, text="Outside the window.", speaker="PROF"),
    ]
    hyp_segs = [
        TranscriptSegment(start_sec=9.8, end_sec=15.2, text="Welcome students.", speaker=None),
        TranscriptSegment(start_sec=16.0, end_sec=22.5, text="Today we discuss data structures.", speaker=None),
        TranscriptSegment(start_sec=400.0, end_sec=405.0, text="Outside the window.", speaker=None),
    ]

    ref = UnifiedTranscript(recording_id="cal_test", source_format="test", segments=ref_segs)
    hyp = UnifiedTranscript(recording_id="cal_test", source_format="test", segments=hyp_segs)

    # Window 0 - 60s
    aligned = extract_calibration_window(ref, hyp, window_start_sec=0.0, window_duration_sec=60.0)
    assert len(aligned) == 2
    assert aligned[0].speaker == "PROF"
    assert aligned[0].status == "MATCH"

    # CSV write
    csv_path = tmp_path / "calibration.csv"
    write_calibration_csv("cal_test", aligned, csv_path)
    assert csv_path.exists()
    content = csv_path.read_text()
    assert "cal_test" in content
    assert "Welcome students." in content

    # HTML write
    html_path = tmp_path / "calibration.html"
    generate_calibration_html("cal_test", "data/normalized/m4a/sample.m4a", aligned, 0.0, 60.0, html_path)
    assert html_path.exists()
    html_txt = html_path.read_text()
    assert "Ground Truth Calibration Review" in html_txt
    assert "cal_test" in html_txt
    assert "Welcome students." in html_txt
