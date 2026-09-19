from __future__ import annotations

from datetime import datetime, UTC
from uuid import uuid4
import pytest
from sqlalchemy import text
from sqlmodel import Session, select

from lecturewhisper.store.models import RecordingRow, JobRow
from lecturewhisper.store.database import get_engine, create_tables
from lecturewhisper.store.files import FileStore

@pytest.fixture
def engine():
    eng = get_engine("sqlite:///:memory:")
    create_tables(eng)
    return eng

@pytest.fixture
def session(engine):
    with Session(engine) as session:
        yield session

def test_create_tables(engine):
    with engine.connect() as conn:
        result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
        tables = [row[0] for row in result.fetchall()]
        assert "recordingrow" in tables
        assert "jobrow" in tables
        assert "timetableslotrow" in tables

def test_wal_mode_file(tmp_path):
    db_path = tmp_path / "test.db"
    eng = get_engine(db_path)
    with eng.connect() as conn:
        result = conn.execute(text("PRAGMA journal_mode;"))
        mode = result.scalar()
        assert mode.lower() == "wal"

def test_crud_recording(session):
    rec = RecordingRow(
        device_id="dev1",
        started_at=datetime.now(UTC),
        duration_s=3600.0,
        sha256="abcdef",
        chunk_count=10,
        status="completed"
    )
    session.add(rec)
    session.commit()
    session.refresh(rec)
    
    assert rec.id is not None
    assert rec.device_id == "dev1"
    
    fetched = session.exec(select(RecordingRow).where(RecordingRow.id == rec.id)).first()
    assert fetched is not None
    assert fetched.sha256 == "abcdef"
    
    fetched.status = "processed"
    session.add(fetched)
    session.commit()
    
    fetched2 = session.exec(select(RecordingRow).where(RecordingRow.id == rec.id)).first()
    assert fetched2.status == "processed"
    
    session.delete(fetched2)
    session.commit()
    assert session.exec(select(RecordingRow).where(RecordingRow.id == rec.id)).first() is None

def test_crud_job(session):
    rec = RecordingRow(
        device_id="dev1",
        started_at=datetime.now(UTC),
        duration_s=3600.0,
        sha256="abcdeff",
        chunk_count=10,
        status="completed"
    )
    session.add(rec)
    session.commit()
    
    job = JobRow(
        recording_id=rec.id,
        status="running",
        stage="transcription",
        progress=0.5
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    
    assert job.id is not None
    assert job.recording_id == rec.id
    assert job.status == "running"

def test_file_store(tmp_path):
    store = FileStore(storage_dir=tmp_path)
    rec_id = uuid4()
    
    audio_data = b"RIFFfakeaudio"
    path = store.save_recording(rec_id, audio_data)
    assert path.exists()
    assert path.read_bytes() == audio_data
    
    assert store.get_recording_path(rec_id) == path
    
    data = {"key": "value"}
    json_path = store.save_json(rec_id, "transcript", data)
    assert json_path.exists()
    
    loaded = store.load_json(rec_id, "transcript")
    assert loaded == data
