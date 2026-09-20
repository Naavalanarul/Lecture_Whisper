"""
Unit tests for unified transcript parsers (SRT, VTT, PDF, MICASE XML).
Tests format detection, timestamp resolution, speaker attribution, and schema invariants.
"""
from pathlib import Path
import pytest

from lecturewhisper.eval.parsers import (
    TranscriptSegment,
    UnifiedTranscript,
    parse_micase_xml,
    parse_pdf,
    parse_srt,
    parse_transcript,
    parse_vtt,
)

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_parse_synthetic_srt():
    srt_path = FIXTURES_DIR / "synthetic_sample.srt"
    assert srt_path.exists()

    transcript = parse_transcript(srt_path, recording_id="test_srt")
    assert transcript.recording_id == "test_srt"
    assert transcript.source_format == "srt"
    assert len(transcript.segments) == 4

    # Segment 1
    seg0 = transcript.segments[0]
    assert seg0.start_sec == 1.0
    assert seg0.end_sec == 3.5
    assert seg0.speaker == "PROFESSOR"
    assert "Good morning, everyone" in seg0.text
    assert "[SQUEAKING]" not in seg0.text  # Noise tag stripped

    # Segment 3 (student question)
    seg2 = transcript.segments[2]
    assert seg2.start_sec == 9.1
    assert seg2.end_sec == 14.4
    assert seg2.speaker == "STUDENT"
    assert "midterm exam next Wednesday" in seg2.text

    # Segment 4 (instructor announcement)
    seg3 = transcript.segments[3]
    assert seg3.start_sec == 15.0
    assert seg3.end_sec == 19.8
    assert seg3.speaker == "PROFESSOR"
    assert "due on Friday" in seg3.text


def test_parse_synthetic_vtt():
    vtt_path = FIXTURES_DIR / "synthetic_sample.vtt"
    assert vtt_path.exists()

    transcript = parse_transcript(vtt_path, recording_id="test_vtt")
    assert transcript.recording_id == "test_vtt"
    assert transcript.source_format == "vtt"
    assert len(transcript.segments) == 4

    # Speaker voice tags <v Dr. Bell>
    seg0 = transcript.segments[0]
    assert seg0.start_sec == 1.2
    assert seg0.end_sec == 4.5
    assert seg0.speaker == "Dr. Bell"
    assert seg0.text == "Welcome to Introduction to Computer Science."

    # Student question voice tag <v Student>
    seg2 = transcript.segments[2]
    assert seg2.start_sec == 10.5
    assert seg2.end_sec == 15.0
    assert seg2.speaker == "Student"
    assert "due at midnight" in seg2.text


def test_parse_synthetic_micase_xml():
    xml_path = FIXTURES_DIR / "synthetic_micase.xml"
    assert xml_path.exists()

    transcript = parse_transcript(xml_path, recording_id="test_micase")
    assert transcript.recording_id == "test_micase"
    assert transcript.source_format == "micase_xml"
    assert len(transcript.segments) == 4

    # Professor turn (PRF)
    seg0 = transcript.segments[0]
    assert seg0.start_sec == 2.5
    assert seg0.end_sec == 7.8
    assert seg0.speaker == "PRF"
    assert "cellular respiration" in seg0.text

    # Student turn (S1)
    seg1 = transcript.segments[1]
    assert seg1.start_sec == 8.4
    assert seg1.end_sec == 13.2
    assert seg1.speaker == "S1"
    assert "lab report is due" in seg1.text

    # Second Student turn (S2)
    seg3 = transcript.segments[3]
    assert seg3.start_sec == 21.0
    assert seg3.end_sec == 24.8
    assert seg3.speaker == "S2"
    assert "office hours" in seg3.text


def test_parse_synthetic_pdf():
    pdf_path = FIXTURES_DIR / "synthetic_sample.pdf"
    assert pdf_path.exists()

    transcript = parse_transcript(pdf_path, recording_id="test_pdf")
    assert transcript.recording_id == "test_pdf"
    assert transcript.source_format == "pdf"
    assert len(transcript.segments) >= 2

    seg0 = transcript.segments[0]
    assert seg0.start_sec == 5.0
    assert "Welcome to the lecture" in seg0.text

    seg1 = transcript.segments[1]
    assert seg1.start_sec == 25.0
    assert "assignment 1 is due next Monday" in seg1.text


def test_schema_invariants():
    # Construct invalid timestamps, ensure post-init clamping
    seg = TranscriptSegment(start_sec=10.0, end_sec=5.0, text="   hello world   ")
    assert seg.start_sec == 10.0
    assert seg.end_sec == 10.0  # Clamped
    assert seg.text == "hello world"

    transcript = UnifiedTranscript(
        recording_id="inv_test",
        source_format="srt",
        segments=[seg],
    )
    d = transcript.to_dict()
    assert d["recording_id"] == "inv_test"
    assert d["source_format"] == "srt"
    assert len(d["segments"]) == 1
    assert d["segments"][0]["start_sec"] == 10.0
    assert transcript.full_text == "hello world"
    assert transcript.total_duration_sec == 10.0


def test_unsupported_format():
    with pytest.raises(ValueError, match="Unsupported transcript format"):
        parse_transcript("sample.docx")


def test_missing_file():
    with pytest.raises(FileNotFoundError):
        parse_transcript("non_existent_file.srt")


def test_parse_json(tmp_path):
    import json
    data = {
        "recording_id": "json_test",
        "source_format": "json",
        "segments": [
            {"start_sec": 0.0, "end_sec": 4.2, "text": "Hello students", "speaker": "PROF"},
            {"start_sec": 4.5, "end_sec": 8.0, "text": "Is there homework?", "speaker": "STUDENT"},
        ],
    }
    json_file = tmp_path / "test.json"
    json_file.write_text(json.dumps(data))

    t = parse_transcript(json_file)
    assert t.recording_id == "json_test"
    assert t.source_format == "json"
    assert len(t.segments) == 2
    assert t.segments[0].speaker == "PROF"
    assert t.segments[1].text == "Is there homework?"

