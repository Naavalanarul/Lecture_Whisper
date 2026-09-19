"""Unit tests for Grounded Q&A extraction (A2)."""

import pytest
from lecturewhisper.api.schemas import ImportantQuestion, Transcript, TranscriptSegment
from lecturewhisper.pipeline.events import QuestionExtractor


def test_lecturer_self_answered_question():
    """Lecturer asks and answers themselves within 60s window."""
    transcript = Transcript(
        asr_model="test",
        language="en",
        segments=[
            TranscriptSegment(
                start=10.0,
                end=18.0,
                speaker="PROF_TURING",
                text="Pay attention to this very important question: why do we memoize Fibonacci?",
                words=[],
            ),
            TranscriptSegment(
                start=19.0,
                end=27.0,
                speaker="PROF_TURING",
                text="Because without memoization, it takes exponential 2^n steps; with a table, it is linear.",
                words=[],
            ),
        ],
    )

    questions = QuestionExtractor.find_questions(transcript)
    assert len(questions) == 1
    q = questions[0]
    assert q.lecturer_self_answered is True
    assert q.student_asked is False
    assert q.start_s == 10.0
    assert q.answer_start_s == 19.0
    assert "exponential" in (q.answer_text or "").lower()
    assert abs(q.answer_start_s - q.start_s) <= 60.0


def test_student_asked_question():
    """Student asks question and lecturer answers within 60s window."""
    transcript = Transcript(
        asr_model="test",
        language="en",
        segments=[
            TranscriptSegment(
                start=30.0,
                end=35.0,
                speaker="STUDENT_01",
                text="Does anyone know what happens if the graph has negative weight cycles?",
                words=[],
            ),
            TranscriptSegment(
                start=36.0,
                end=44.0,
                speaker="PROF_TURING",
                text="Negative weight cycles make shortest paths undefined because you can loop infinitely.",
                words=[],
            ),
        ],
    )

    questions = QuestionExtractor.find_questions(transcript)
    assert len(questions) == 1
    q = questions[0]
    assert q.student_asked is True
    assert q.lecturer_self_answered is False
    assert "negative weight cycles" in (q.answer_text or "").lower()
    assert q.answer_start_s == 36.0


def test_unanswered_question_fallback():
    """If a question was asked and never answered in the lecture, fallback to strict message."""
    transcript = Transcript(
        asr_model="test",
        language="en",
        segments=[
            TranscriptSegment(
                start=50.0,
                end=55.0,
                speaker="PROF_TURING",
                text="Think about this very important question for next time: can Bellman-Ford run in linear time?",
                words=[],
            ),
            # Next segment is far away (>60s) or unrelated topic
            TranscriptSegment(
                start=130.0,
                end=140.0,
                speaker="PROF_TURING",
                text="Now let's pack up our bags and see you all on Friday.",
                words=[],
            ),
        ],
    )

    questions = QuestionExtractor.find_questions(transcript)
    assert len(questions) == 1
    q = questions[0]
    assert q.answer_text == "No answer given in this lecture"


def test_no_duplicate_question_descriptions():
    """No two question cards may have identical descriptions."""
    transcript = Transcript(
        asr_model="test",
        language="en",
        segments=[
            TranscriptSegment(start=1.0, end=5.0, speaker="PROF", text="Very important question: what is BFS?", words=[]),
            TranscriptSegment(start=6.0, end=10.0, speaker="PROF", text="BFS visits level by level.", words=[]),
            TranscriptSegment(start=11.0, end=15.0, speaker="PROF", text="Another very important question: what is DFS?", words=[]),
            TranscriptSegment(start=16.0, end=20.0, speaker="PROF", text="DFS visits depth first.", words=[]),
        ],
    )
    questions = QuestionExtractor.find_questions(transcript)
    texts = [q.text for q in questions]
    assert len(texts) == len(set(texts))


def test_ui_backend_enum_match():
    """UI TypeScript types must match backend ImportantQuestion reasons exactly."""
    from pathlib import Path
    import re
    from lecturewhisper.api.schemas import ImportantQuestion

    ui_types_path = Path(__file__).parent.parent.parent / "ui" / "src" / "types.ts"
    assert ui_types_path.exists()
    content = ui_types_path.read_text(encoding="utf-8")

    # Extract reasons from TypeScript interface
    match = re.search(r"reason:\s*['\"]([^'\"]+)['\"]\s*\|\s*['\"]([^'\"]+)['\"]\s*\|\s*['\"]([^'\"]+)['\"]", content)
    assert match is not None
    ts_reasons = set(match.groups())

    # Extract reasons from Pydantic schema
    schema_field = ImportantQuestion.model_fields["reason"]
    # In Pydantic v2, typing.Literal args can be inspected via __args__
    import typing
    backend_reasons = set(typing.get_args(schema_field.annotation))

    assert ts_reasons == backend_reasons
