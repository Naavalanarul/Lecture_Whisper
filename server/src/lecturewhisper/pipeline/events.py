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
    (r"\b(this will come in the exam|remember this for the exam|very important question|vital question|pay (?:close )?attention to this|critical question)\b", "teacher_flagged"),
    (r"\b(who can tell me|does anyone know|what do you think|can someone explain|can anyone explain|who knows)\b", "posed_to_class"),
    (r"\b(let me repeat the question|again the question is|as i asked before)\b", "repeated"),
    (r"\b(why does|how does|what happens when|what happens if|why do we|how do we)\b.*?\?", "teacher_flagged"),
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
                        title=f"{ev_type.replace('_', ' ').capitalize()}: {text[:50].strip()}...",
                        date_iso=date_info.get("date_iso"),
                        date_text=date_info.get("date_text", "unspecified date"),
                        resolved=date_info.get("resolved", False),
                        confidence=0.85 if date_info.get("resolved") else 0.65,
                        source_quote=text,
                        start_s=seg.start,
                        needs_review=date_info.get("needs_review", not date_info.get("resolved", False)),
                        candidate_dates=date_info.get("candidate_dates"),
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
        Parse relative or absolute date expressions deterministically against the lecture start time.
        - Resolves relative dates ('tomorrow', 'in two weeks', 'next Friday') against base_datetime (UTC).
        - If base_datetime is missing timezone, assumes UTC.
        - If day-of-week is ambiguous ('next Monday' when lecture is on Monday), returns both candidates with needs_review: true.
        - Date-only events do NOT fabricate spoken times.
        """
        from datetime import date, timedelta, timezone

        if base_datetime is None:
            base_dt = datetime.now(timezone.utc)
        elif base_datetime.tzinfo is None:
            base_dt = base_datetime.replace(tzinfo=timezone.utc)
        else:
            base_dt = base_datetime.astimezone(timezone.utc)

        base_date = base_dt.date()
        lower_text = text.lower()

        # Check for explicit time first
        time_match = re.search(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b", lower_text)
        time_24_match = re.search(r"\b([01]?\d|2[0-3]):([0-5]\d)\b", lower_text)
        time_str: str | None = None

        if time_match:
            hr = int(time_match.group(1))
            mn = int(time_match.group(2) or 0)
            ampm = time_match.group(3)
            if ampm == "pm" and hr < 12:
                hr += 12
            elif ampm == "am" and hr == 12:
                hr = 0
            time_str = f"{hr:02d}:{mn:02d}:00"
        elif time_24_match and ("at " in lower_text or "by " in lower_text):
            hr = int(time_24_match.group(1))
            mn = int(time_24_match.group(2))
            time_str = f"{hr:02d}:{mn:02d}:00"

        def format_iso(d: date) -> str:
            if time_str:
                return f"{d.isoformat()}T{time_str}Z"
            return d.isoformat()

        # 1. "tomorrow"
        if re.search(r"\btomorrow\b", lower_text):
            target_date = base_date + timedelta(days=1)
            return {
                "date_iso": format_iso(target_date),
                "date_text": "tomorrow",
                "resolved": True,
                "needs_review": False,
            }

        # 2. "in X days"
        days_match = re.search(r"\bin\s+(\d+|one|two|three|four|five)\s+days?\b", lower_text)
        if days_match:
            word_to_num = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5}
            val_str = days_match.group(1)
            num_days = word_to_num.get(val_str, int(val_str) if val_str.isdigit() else 1)
            target_date = base_date + timedelta(days=num_days)
            return {
                "date_iso": format_iso(target_date),
                "date_text": days_match.group(0),
                "resolved": True,
                "needs_review": False,
            }

        # 3. "in X weeks"
        weeks_match = re.search(r"\bin\s+(\d+|one|two|three|four)\s+weeks?\b", lower_text)
        if weeks_match:
            word_to_num = {"one": 1, "two": 2, "three": 3, "four": 4}
            val_str = weeks_match.group(1)
            num_weeks = word_to_num.get(val_str, int(val_str) if val_str.isdigit() else 1)
            target_date = base_date + timedelta(weeks=num_weeks)
            return {
                "date_iso": format_iso(target_date),
                "date_text": weeks_match.group(0),
                "resolved": True,
                "needs_review": False,
            }

        # 4. Explicit Month + Day (e.g. "November 12th", "October 15")
        month_map = {
            "january": 1, "february": 2, "march": 3, "april": 4,
            "may": 5, "june": 6, "july": 7, "august": 8,
            "september": 9, "october": 10, "november": 11, "december": 12,
            "jan": 1, "feb": 2, "mar": 3, "apr": 4, "jun": 6,
            "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
        }
        month_names = "|".join(month_map.keys())
        abs_date_match = re.search(
            rf"\b({month_names})\s+(\d{{1,2}})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{{4}}))?\b",
            lower_text,
        )
        if abs_date_match:
            m_num = month_map[abs_date_match.group(1)]
            d_num = int(abs_date_match.group(2))
            y_num = int(abs_date_match.group(3)) if abs_date_match.group(3) else base_date.year
            # If target date in current year is already past by more than 60 days, assume next year
            try:
                target_date = date(y_num, m_num, d_num)
                if not abs_date_match.group(3) and target_date < base_date - timedelta(days=60):
                    target_date = date(y_num + 1, m_num, d_num)
                return {
                    "date_iso": format_iso(target_date),
                    "date_text": abs_date_match.group(0),
                    "resolved": True,
                    "needs_review": False,
                }
            except ValueError:
                pass

        # 5. Weekdays (Monday - Sunday)
        weekday_map = {
            "monday": 0, "tuesday": 1, "wednesday": 2,
            "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6,
        }
        weekday_pattern = r"\b(?:(this|next)\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b"
        wd_match = re.search(weekday_pattern, lower_text)
        if wd_match:
            modifier = wd_match.group(1) or ""
            is_next = modifier == "next"
            is_this = modifier == "this"
            target_wd = weekday_map[wd_match.group(2)]
            base_wd = base_date.weekday()

            if target_wd == base_wd:
                # Ambiguous: speaker is lecturing on Monday and says "next Monday" or "on Monday"
                # Candidate 1: Today (+0 days)
                # Candidate 2: Next week (+7 days)
                cand1 = format_iso(base_date)
                cand2 = format_iso(base_date + timedelta(days=7))
                return {
                    "date_iso": cand2 if is_next else cand1,
                    "date_text": wd_match.group(0),
                    "resolved": True if is_next else False,
                    "needs_review": True,
                    "candidate_dates": [cand1, cand2],
                }
            else:
                days_ahead = (target_wd - base_wd) % 7
                if days_ahead == 0:
                    days_ahead = 7

                if is_next and target_wd > base_wd:
                    # e.g. Monday speaking about "next Friday":
                    # Standard meaning is Friday of next week (+11 days), but colloquial usage may mean this Friday (+4 days).
                    cand_this_week = format_iso(base_date + timedelta(days=days_ahead))
                    cand_next_week = format_iso(base_date + timedelta(days=days_ahead + 7))
                    return {
                        "date_iso": cand_next_week,
                        "date_text": wd_match.group(0),
                        "resolved": True,
                        "needs_review": True,
                        "candidate_dates": [cand_this_week, cand_next_week],
                    }
                else:
                    target_date = base_date + timedelta(days=days_ahead)
                    return {
                        "date_iso": format_iso(target_date),
                        "date_text": wd_match.group(0),
                        "resolved": True,
                        "needs_review": False,
                    }

        # Fallback date text search
        fallback_match = re.search(
            r"\b(by\s+\w+\s+\d{1,2}|on\s+\w+\s+\d{1,2}|next\s+week)\b",
            lower_text,
        )
        date_text = fallback_match.group(0) if fallback_match else "unspecified"
        return {
            "date_iso": None,
            "date_text": date_text,
            "resolved": False,
            "needs_review": True,
        }


class QuestionExtractor:
    """Extracts high-value lecture questions strictly grounded in the transcript."""

    @classmethod
    def find_questions(cls, transcript: Transcript) -> list[ImportantQuestion]:
        """
        Identify instructor-flagged, class-posed, or repeated questions.
        - Grounded strictly in transcript within +-60s.
        - Labels lecturer_self_answered vs student_asked.
        - If unanswered in lecture, sets answer to 'No answer given in this lecture'.
        - Prevents duplicate card texts.
        """
        questions: list[ImportantQuestion] = []
        seen_texts: set[str] = set()
        claimed_answer_indices: set[int] = set()

        segments = transcript.segments
        n_segs = len(segments)

        for i, seg in enumerate(segments):
            text = seg.text.strip()
            lower_text = text.lower()

            matched_reason = None
            for pattern, reason in QUESTION_CUE_PATTERNS:
                if re.search(pattern, lower_text):
                    matched_reason = reason
                    break

            if not matched_reason:
                continue

            # If segment is a question preamble (e.g. "Pay close attention to this vital question:"),
            # merge with immediate question body in next segment
            start_offset = 1
            if (text.endswith(":") or len(text.split()) <= 10) and i + 1 < n_segs:
                next_seg = segments[i + 1]
                if next_seg.start - seg.end < 5.0 and ("?" in next_seg.text or any(next_seg.text.lower().startswith(q) for q in ("why", "how", "what", "can", "does", "is"))):
                    text = f"{text} {next_seg.text.strip()}"
                    start_offset = 2

            if text in seen_texts:
                continue
            seen_texts.add(text)

            is_student = "student" in seg.speaker.lower()

            # Search for the immediate answer segment within +60s
            answer_text: str | None = None
            answer_start_s: float | None = None
            answer_end_s: float | None = None
            answer_snippet: str | None = None
            lecturer_self_answered = False
            student_asked = is_student

            for j in range(i + start_offset, n_segs):
                if j in claimed_answer_indices:
                    continue

                ans_seg = segments[j]
                time_diff = ans_seg.start - seg.end
                if time_diff > 60.0:
                    break  # Outside 60s window

                # Skip if this segment is also a question or contains class farewells
                ans_text = ans_seg.text.strip()
                ans_lower = ans_text.lower()
                if any(re.search(pat, ans_lower) for pat, _ in QUESTION_CUE_PATTERNS):
                    continue
                if "see you all" in ans_lower or "pack up our bags" in ans_lower:
                    continue

                # Found distinct answering segment
                claimed_answer_indices.add(j)
                answer_text = ans_text
                answer_start_s = ans_seg.start
                answer_end_s = ans_seg.end
                answer_snippet = ans_text
                if not is_student:
                    lecturer_self_answered = True
                break

            if not answer_text:
                answer_text = "No answer given in this lecture"

            questions.append(
                ImportantQuestion(
                    text=text,
                    start_s=seg.start,
                    end_s=seg.end,
                    reason=matched_reason,  # type: ignore[arg-type]
                    answer_text=answer_text,
                    answer_start_s=answer_start_s,
                    answer_end_s=answer_end_s,
                    transcript_snippet=text,
                    answer_snippet=answer_snippet,
                    lecturer_self_answered=lecturer_self_answered,
                    student_asked=student_asked,
                )
            )

        logger.info("Extracted %d grounded questions from transcript", len(questions))
        return questions
