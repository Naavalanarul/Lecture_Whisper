from __future__ import annotations

import os
from sqlmodel import Session, select
from lecturewhisper.store.database import get_engine, create_tables
from lecturewhisper.store.models import RecordingRow, TimetableSlotRow, EventRow, TranscriptRow, NotesRow
from lecturewhisper.demo import seed_demo_data, should_seed_demo


def test_fresh_database_is_empty():
    engine = get_engine("sqlite:///:memory:")
    create_tables(engine)
    with Session(engine) as session:
        recs = session.exec(select(RecordingRow)).all()
        slots = session.exec(select(TimetableSlotRow)).all()
        events = session.exec(select(EventRow)).all()
        assert len(recs) == 0
        assert len(slots) == 0
        assert len(events) == 0


def test_seed_demo_data_populates_rich_showcase():
    engine = get_engine("sqlite:///:memory:")
    create_tables(engine)
    with Session(engine) as session:
        rec_id = seed_demo_data(session)
        assert rec_id is not None

        recs = session.exec(select(RecordingRow)).all()
        assert len(recs) == 1
        assert recs[0].subject == "CS 106B Dynamic Programming"
        assert recs[0].chunk_count == 6

        slots = session.exec(select(TimetableSlotRow)).all()
        assert len(slots) == 4

        events = session.exec(select(EventRow)).all()
        assert len(events) >= 2

        transcript = session.exec(select(TranscriptRow).where(TranscriptRow.recording_id == recs[0].id)).first()
        assert transcript is not None

        notes = session.exec(select(NotesRow).where(NotesRow.recording_id == recs[0].id)).first()
        assert notes is not None

        # Idempotency check: seeding again does not duplicate
        rec_id2 = seed_demo_data(session)
        assert rec_id2 == rec_id
        assert len(session.exec(select(RecordingRow)).all()) == 1
        assert len(session.exec(select(TimetableSlotRow)).all()) == 4


def test_should_seed_demo_flag_and_env(monkeypatch):
    monkeypatch.delenv("DEMO_MODE", raising=False)
    assert should_seed_demo(cli_flag=False) is False
    assert should_seed_demo(cli_flag=True) is True

    monkeypatch.setenv("DEMO_MODE", "1")
    assert should_seed_demo(cli_flag=False) is True

    monkeypatch.setenv("DEMO_MODE", "0")
    assert should_seed_demo(cli_flag=False) is False
