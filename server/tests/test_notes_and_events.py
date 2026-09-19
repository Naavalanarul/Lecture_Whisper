"""Tests for Phase 3 notes generation, event/question extraction, and phrase analysis."""

from __future__ import annotations

import json
import sys
from datetime import UTC, datetime
from pathlib import Path

# Ensure monorepo root is on sys.path for eval/ fixtures
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import pytest

from eval.run_eval import evaluate_fixtures
from lecturewhisper.api.schemas import Transcript
from lecturewhisper.pipeline.chapters import ChapterSegmenter
from lecturewhisper.pipeline.events import EventExtractor, QuestionExtractor
from lecturewhisper.pipeline.notes import NotesGenerator
from lecturewhisper.pipeline.phrases import PhraseAnalyzer

FIXTURE_PATH = Path(__file__).parent.parent.parent / "eval" / "fixtures" / "lecture_transcript.json"


@pytest.fixture
def sample_transcript() -> Transcript:
    data = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    return Transcript.model_validate(data)


def test_chapter_segmenter(sample_transcript: Transcript) -> None:
    """ChapterSegmenter should partition transcript into valid chunks within token limits."""
    segmenter = ChapterSegmenter(max_tokens_per_chapter=200)
    chunks = segmenter.segment_transcript(sample_transcript)
    assert len(chunks) >= 1
    for chunk in chunks:
        assert chunk.end >= chunk.start
        assert len(chunk.text) > 0


def test_event_extraction(sample_transcript: Transcript) -> None:
    """EventExtractor should extract academic events and resolve dates."""
    base_dt = datetime(2026, 10, 1, 9, 0, 0, tzinfo=UTC)
    events = EventExtractor.find_candidates(sample_transcript, base_datetime=base_dt)

    assert len(events) >= 3
    event_types = {e.type for e in events}
    assert "quiz" in event_types
    assert "assignment_deadline" in event_types
    assert "exam" in event_types

    # Verify source quote and timestamps preserved
    for ev in events:
        assert ev.source_quote
        assert ev.start_s >= 0.0


def test_question_extraction(sample_transcript: Transcript) -> None:
    """QuestionExtractor should detect teacher-flagged and class-posed questions."""
    questions = QuestionExtractor.find_questions(sample_transcript)
    assert len(questions) >= 2

    reasons = {q.reason for q in questions}
    assert "teacher_flagged" in reasons or "posed_to_class" in reasons
    for q in questions:
        assert len(q.text) > 0
        assert q.start_s >= 0.0


def test_phrase_analysis(sample_transcript: Transcript) -> None:
    """PhraseAnalyzer should isolate repeated emphasis phrases from verbal habits."""
    phrases = PhraseAnalyzer.analyze(sample_transcript, min_emphasis_count=2, min_habit_count=1)

    # Habits should include filler "okay so"
    habit_phrases = [h.phrase for h in phrases.habits]
    assert any("okay so" in h for h in habit_phrases)

    # Emphasis should include technical concepts
    emphasis_phrases = [e.phrase for e in phrases.emphasis]
    assert any("dynamic programming" in ep for ep in emphasis_phrases)

    # Habits and emphasis must be strictly separate
    common = set(habit_phrases).intersection(set(emphasis_phrases))
    assert len(common) == 0


def test_notes_generator(sample_transcript: Transcript) -> None:
    """NotesGenerator should produce structured Notes with chapters and overall summary."""
    gen = NotesGenerator()
    notes = gen.generate(sample_transcript)

    assert len(notes.chapters) >= 1
    first_ch = notes.chapters[0]
    assert first_ch.title
    assert first_ch.summary
    assert len(first_ch.key_points) > 0
    assert notes.overall_summary


def test_eval_fixtures_runner() -> None:
    """Eval runner should compute and report metrics."""
    metrics = evaluate_fixtures()
    assert metrics["event_precision"] >= 0.6
    assert metrics["event_recall"] >= 0.6
    assert metrics["question_recall"] >= 0.6
