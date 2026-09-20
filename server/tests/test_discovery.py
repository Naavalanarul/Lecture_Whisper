"""
Unit tests for Announcement, Event, and Question Discovery Engine.
Tests cue matching, temporal window scoring (+/- 20s), question detection, and review exports.
"""
from pathlib import Path
import pytest

from lecturewhisper.eval.discovery import (
    CandidateItem,
    discover_announcements_and_events,
    generate_announcements_review_html,
    write_candidates_csv,
)
from lecturewhisper.eval.parsers import TranscriptSegment, UnifiedTranscript


def test_discover_announcement_with_temporal_anchor():
    segments = [
        TranscriptSegment(start_sec=10.0, end_sec=14.0, text="Welcome everyone to lecture one.", speaker="PROFESSOR"),
        TranscriptSegment(start_sec=15.0, end_sec=18.0, text="Problem set 1 is due next Friday by 5pm.", speaker="PROFESSOR"),
        TranscriptSegment(start_sec=19.0, end_sec=25.0, text="Please submit your solutions on the course portal.", speaker="PROFESSOR"),
    ]
    transcript = UnifiedTranscript(recording_id="test_disc", source_format="test", segments=segments)

    candidates = discover_announcements_and_events(transcript)
    assert len(candidates) >= 1

    ann = next(c for c in candidates if c.kind == "announcement")
    assert ann.category == "assignment"
    assert ann.matched_cue in ("problem set", "due", "submit")
    assert ann.detected_date is not None
    assert "friday" in ann.detected_date.lower() or "5pm" in ann.detected_date.lower() or "next week" in ann.detected_date.lower()
    assert ann.score > 0.80  # Boosted by temporal anchor and professor speaker
    assert ann.status == "PENDING_REVIEW"
    assert ann.human_verified is False


def test_discover_questions():
    segments = [
        TranscriptSegment(start_sec=5.0, end_sec=9.0, text="Why is binary search logarithmic?", speaker="STUDENT"),
        TranscriptSegment(start_sec=10.0, end_sec=14.0, text="Does everyone understand this proof?", speaker="PROFESSOR"),
    ]
    transcript = UnifiedTranscript(recording_id="test_q", source_format="test", segments=segments)

    candidates = discover_announcements_and_events(transcript)
    questions = [c for c in candidates if c.kind == "question"]
    assert len(questions) == 2

    # Student question
    sq = next(q for q in questions if q.category == "student_question")
    assert "binary search" in sq.text
    assert sq.score >= 0.70

    # Instructor prompt
    iq = next(q for q in questions if q.category == "instructor_prompt")
    assert "understand this proof" in iq.text
    assert iq.score >= 0.75


def test_candidates_export_and_html(tmp_path):
    segments = [
        TranscriptSegment(start_sec=1.0, end_sec=5.0, text="The midterm exam is next Wednesday.", speaker="PROFESSOR"),
    ]
    transcript = UnifiedTranscript(recording_id="export_test", source_format="test", segments=segments)
    candidates = discover_announcements_and_events(transcript)

    csv_file = tmp_path / "candidates.csv"
    write_candidates_csv(candidates, csv_file)
    assert csv_file.exists()
    content = csv_file.read_text()
    assert "ANN-" in content
    assert "midterm" in content
    assert "wednesday" in content.lower()

    html_file = tmp_path / "review.html"
    generate_announcements_review_html(candidates, html_file)
    assert html_file.exists()
    html_content = html_file.read_text()
    assert "Announcements & Questions Review" in html_content
    assert "midterm" in html_content
