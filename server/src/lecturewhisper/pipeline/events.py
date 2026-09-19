"""Hybrid event and important question extraction with relative date resolution."""

from __future__ import annotations

import logging
import re
from datetime import datetime
from typing import Any

from lecturewhisper.api.schemas import Event, ImportantQuestion, Transcript

logger = logging.getLogger(__name__)

# Event cue patterns mapping to event types
EVENT_PATTERNS = [
    (r"\b(quiz|pop quiz)\b", "quiz"),
    (r"\b(assignment|homework|problem set|pset)\b.*?\b(due|submit|deadline|hand in)\b", "assignment_deadline"),
    (r"\b(due|submit by|deadline is|hand in by)\b", "assignment_deadline"),
    (r"\b(midterm|final exam|examination|exam will|in the exam)\b", "exam"),
    (r"\b(project|term project|group project)\b.*?\b(due|submit|present)\b", "project"),
    (r"\b(seminar|guest lecture|guest speaker|workshop)\b", "seminar"),
    (r"\b(class is canceled|rescheduled|schedule change|no class|moved to)\b", "schedule_change"),
]

QUESTION_CUE_PATTERNS = [
    (r"\b(this will come in the exam|remember this for the exam|very important question|pay attention to this)\b", "teacher_flagged"),
    (r"\b(who can tell me|does anyone know|what do you think|can someone explain)\b", "posed_to_class"),
    (r"\b(let me repeat the question|again the question is|as i asked before)\b", "repeated"),
]


class EventExtractor:
    """Extracts academic deadlines and events using hybrid regex, dateparser, and rules."""

    @classmethod
    def find_candidates(
        cls,
        transcript: Transcript,
        base_datetime: datetime | None = None,
    ) -> list[Event]:
        """Scan transcript segments for event candidate matches."""
        events: list[Event] = []

        for seg in transcript.segments:
            text = seg.text
            lower_text = text.lower()

            for pattern, ev_type in EVENT_PATTERNS:
                match = re.search(pattern, lower_text)
                if match:
                    # Attempt to resolve date in this segment or adjacent context
                    date_info = cls.resolve_date(text, base_datetime)

                    event = Event(
                        type=ev_type,  # type: ignore[arg-type]
                        title=f"{ev_type.replace('_', ' ').title()}: {text[:50].strip()}...",
                        date_iso=date_info.get("date_iso"),
                        date_text=date_info.get("date_text", "unspecified date"),
                        resolved=date_info.get("resolved", False),
                        confidence=0.85 if date_info.get("resolved") else 0.65,
                        source_quote=text,
                        start_s=seg.start,
                        needs_review=not date_info.get("resolved", False),
                    )
                    events.append(event)
                    break  # One event match per segment

        logger.info("Extracted %d event candidates from transcript", len(events))
        return events

    @staticmethod
    def resolve_date(
        text: str,
        base_datetime: datetime | None = None,
    ) -> dict[str, Any]:
        """
        Parse relative or absolute date expressions against the lecture start time.
        If date is ambiguous or absent, mark resolved=False, needs_review=True. Never guess.
        """
        try:
            import dateparser
        except ImportError:
            dateparser = None  # type: ignore[assignment]

        # Common date patterns: e.g. "next Friday", "October 15", "tomorrow", "in two weeks"
        date_pattern = r"\b(next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|tomorrow|by\s+\w+\s+\d{1,2}|on\s+\w+\s+\d{1,2}|in\s+\d+\s+days?|next\s+week)\b"
        match = re.search(date_pattern, text, re.IGNORECASE)
        date_text = match.group(0) if match else "unspecified"

        if match and dateparser and base_datetime:
            settings = {
                "RELATIVE_BASE": base_datetime,
                "PREFER_DATES_FROM": "future",
            }
            parsed = dateparser.parse(date_text, settings=settings)
            if parsed:
                return {
                    "date_iso": parsed.strftime("%Y-%m-%d"),
                    "date_text": date_text,
                    "resolved": True,
                }

        # If date text found without dateparser or ambiguous
        if match:
            return {
                "date_iso": None,
                "date_text": date_text,
                "resolved": False,
            }

        return {
            "date_iso": None,
            "date_text": "unspecified",
            "resolved": False,
        }


class QuestionExtractor:
    """Extracts high-value lecture questions."""

    @classmethod
    def find_questions(cls, transcript: Transcript) -> list[ImportantQuestion]:
        """Identify instructor-flagged, class-posed, or repeated questions."""
        questions: list[ImportantQuestion] = []

        for seg in transcript.segments:
            text = seg.text
            lower_text = text.lower()

            for pattern, reason in QUESTION_CUE_PATTERNS:
                if re.search(pattern, lower_text):
                    questions.append(
                        ImportantQuestion(
                            text=text,
                            start_s=seg.start,
                            reason=reason,  # type: ignore[arg-type]
                        )
                    )
                    break

        logger.info("Extracted %d important questions from transcript", len(questions))
        return questions
