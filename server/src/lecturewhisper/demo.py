from __future__ import annotations

import json
import os
from datetime import datetime, UTC, timedelta
from uuid import UUID, uuid5, NAMESPACE_DNS
from sqlmodel import Session, select

from lecturewhisper.store.models import (
    RecordingRow,
    TimetableSlotRow,
    TranscriptRow,
    NotesRow,
    EventRow,
)

DEMO_NAMESPACE = uuid5(NAMESPACE_DNS, "demo.lecturewhisper.local")
DEMO_REC_UUID = uuid5(DEMO_NAMESPACE, "rec-demo-cs106b")
DEMO_SHA256 = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"


def should_seed_demo(cli_flag: bool = False) -> bool:
    """Return True if demo mode is requested via CLI flag or DEMO_MODE env var."""
    if cli_flag:
        return True
    return os.environ.get("DEMO_MODE") == "1"


def seed_demo_data(session: Session) -> UUID:
    """Seed rich demo data into database if not already present.

    Idempotent: skips seeding if demo recording or slots already exist.
    """
    # 1. Check if demo recording exists
    existing = session.exec(select(RecordingRow).where(RecordingRow.id == DEMO_REC_UUID)).first()
    if existing:
        return existing.id

    now = datetime.now(UTC)

    # 2. Seed Timetable Slots
    slots_data = [
        {
            "id": uuid5(DEMO_NAMESPACE, "slot-cs106b-mon"),
            "weekday": 0,
            "start_time": "10:00",
            "end_time": "11:30",
            "subject": "CS 106B Dynamic Programming",
            "room": "Auditorium B",
            "lecturer": "Prof. Alan Turing",
            "timetable_group_id": "sem-fall-2026",
        },
        {
            "id": uuid5(DEMO_NAMESPACE, "slot-math51-tue"),
            "weekday": 1,
            "start_time": "14:00",
            "end_time": "15:30",
            "subject": "MATH 51 Linear Algebra",
            "room": "Science Hall 101",
            "lecturer": "Prof. Carl Gauss",
            "timetable_group_id": "sem-fall-2026",
        },
        {
            "id": uuid5(DEMO_NAMESPACE, "slot-cs106b-wed"),
            "weekday": 2,
            "start_time": "10:00",
            "end_time": "11:30",
            "subject": "CS 106B Dynamic Programming",
            "room": "Auditorium B",
            "lecturer": "Prof. Alan Turing",
            "timetable_group_id": "sem-fall-2026",
        },
        {
            "id": uuid5(DEMO_NAMESPACE, "slot-math51-thu"),
            "weekday": 3,
            "start_time": "14:00",
            "end_time": "15:30",
            "subject": "MATH 51 Linear Algebra",
            "room": "Science Hall 101",
            "lecturer": "Prof. Carl Gauss",
            "timetable_group_id": "sem-fall-2026",
        },
    ]

    for s_info in slots_data:
        existing_slot = session.exec(select(TimetableSlotRow).where(TimetableSlotRow.id == s_info["id"])).first()
        if not existing_slot:
            session.add(TimetableSlotRow(**s_info))

    # 3. Seed Demo Recording
    demo_rec = RecordingRow(
        id=DEMO_REC_UUID,
        device_id="pixel-8a-naavalan",
        started_at=now - timedelta(hours=3),
        duration_s=3420.0,
        timetable_slot_id=slots_data[0]["id"],
        subject="CS 106B Dynamic Programming",
        sha256=DEMO_SHA256,
        chunk_count=6,
        status="completed",
    )
    session.add(demo_rec)

    # 4. Seed Transcript
    transcript_payload = {
        "text": (
            "Good morning everyone. Today we are diving into Dynamic Programming and memoization. "
            "Remember that dynamic programming applies when we have overlapping subproblems and optimal substructure. "
            "Does memoization always improve the asymptotic time complexity? "
            "Yes, provided the state space is polynomial and lookups take O(1) time. "
            "Please remember that Assignment 3 is due next Friday at 11:59 PM."
        ),
        "language": "en",
        "segments": [
            {
                "start": 0.0,
                "end": 14.5,
                "text": "Good morning everyone. Today we are diving into Dynamic Programming and memoization.",
                "speaker": "SPEAKER_00",
            },
            {
                "start": 14.5,
                "end": 35.0,
                "text": "Remember that dynamic programming applies when we have overlapping subproblems and optimal substructure.",
                "speaker": "SPEAKER_00",
            },
            {
                "start": 35.5,
                "end": 45.0,
                "text": "Does memoization always improve the asymptotic time complexity?",
                "speaker": "SPEAKER_01",
            },
            {
                "start": 45.5,
                "end": 62.0,
                "text": "Yes, provided the state space is polynomial and lookups take O(1) time.",
                "speaker": "SPEAKER_00",
            },
            {
                "start": 62.5,
                "end": 85.0,
                "text": "Please remember that Assignment 3 is due next Friday at 11:59 PM.",
                "speaker": "SPEAKER_00",
            },
        ],
    }
    session.add(
        TranscriptRow(
            recording_id=DEMO_REC_UUID,
            data=json.dumps(transcript_payload),
            asr_model="whisper-large-v3-mlx",
            language="en",
        )
    )

    # 5. Seed Notes
    notes_payload = {
        "summary": "Lecture covered core dynamic programming foundations: overlapping subproblems and optimal substructure. Compared memoization against tabulation.",
        "key_concepts": [
            "Overlapping Subproblems",
            "Optimal Substructure",
            "Memoization vs Tabulation",
            "State Space Complexity",
        ],
        "chapters": [
            {"title": "Introduction to DP", "start_s": 0.0, "end_s": 900.0},
            {"title": "Memoization Mechanics", "start_s": 900.0, "end_s": 2100.0},
            {"title": "Grid Traveler & 0/1 Knapsack", "start_s": 2100.0, "end_s": 3420.0},
        ],
        "important_questions": [
            {
                "question": "Does memoization always improve the asymptotic time complexity?",
                "start_s": 35.5,
                "end_s": 45.0,
                "speaker": "SPEAKER_01",
                "answer_text": "Yes, provided the state space is polynomial and lookups take O(1) time.",
                "answer_start_s": 45.5,
                "transcript_snippet": "Does memoization always improve the asymptotic time complexity? Yes, provided the state space is polynomial",
                "lecturer_self_answered": False,
                "student_asked": True,
            }
        ],
        "speaker_stats": {
            "lecturer_speaker_id": "SPEAKER_00",
            "speaker_distribution": {"SPEAKER_00": 85.2, "SPEAKER_01": 14.8},
            "talk_times": {"SPEAKER_00": 2600.0, "SPEAKER_01": 450.0},
            "total_speech_time_s": 3050.0,
            "total_duration_s": 3420.0,
            "silence_time_s": 370.0,
            "discrepancy_detected": False,
            "wpm": {"SPEAKER_00": 138, "SPEAKER_01": 122},
        },
        "repeated_phrases": [
            {
                "phrase": "optimal substructure",
                "count": 9,
                "first_occurrence_s": 18.0,
                "last_occurrence_s": 3200.0,
                "mean_inter_arrival_s": 397.7,
                "context_snippet": "dynamic programming applies when we have overlapping subproblems and optimal substructure",
                "description": "Core technical requirement for dynamic programming correctness",
            },
            {
                "phrase": "memoization table",
                "count": 7,
                "first_occurrence_s": 45.0,
                "last_occurrence_s": 2900.0,
                "mean_inter_arrival_s": 475.8,
                "context_snippet": "storing computed subproblem answers into our memoization table",
                "description": "Cache data structure indexed by subproblem parameters",
            },
        ],
    }
    session.add(
        NotesRow(
            recording_id=DEMO_REC_UUID,
            data=json.dumps(notes_payload),
        )
    )

    # 6. Seed Events
    due_date = (now + timedelta(days=7)).strftime("%Y-%m-%d")
    events = [
        EventRow(
            recording_id=DEMO_REC_UUID,
            type="deadline",
            title="Assignment 3: Dynamic Programming",
            date_iso=due_date,
            date_text="next Friday at 11:59 PM",
            resolved=True,
            confidence=0.96,
            source_quote="Please remember that Assignment 3 is due next Friday at 11:59 PM.",
            start_s=62.5,
            needs_review=False,
        ),
        EventRow(
            recording_id=DEMO_REC_UUID,
            type="exam",
            title="CS 106B Midterm Examination",
            date_iso=(now + timedelta(days=21)).strftime("%Y-%m-%d"),
            date_text="in three weeks during regular class hours",
            resolved=True,
            confidence=0.94,
            source_quote="The midterm exam will take place in three weeks during regular class hours.",
            start_s=120.0,
            needs_review=False,
        ),
    ]
    for ev in events:
        session.add(ev)

    session.commit()
    return DEMO_REC_UUID
