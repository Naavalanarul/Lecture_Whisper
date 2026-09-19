"""Tests for timetable extract, sync, and recording upload routes."""

from __future__ import annotations

import io
from pathlib import Path
from unittest.mock import patch

from typing import Generator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

import lecturewhisper.store.models  # noqa: F401
from lecturewhisper.api.app import create_app
from lecturewhisper.store.database import get_db


@pytest.fixture(name="client")
def client_fixture(tmp_path: Path) -> Generator[TestClient, None, None]:
    test_db = f"sqlite:///{tmp_path}/test.db"
    test_engine = create_engine(test_db, echo=False)
    SQLModel.metadata.create_all(test_engine)

    def override_get_db() -> Generator[Session, None, None]:
        with Session(test_engine) as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_timetable_sync_route(client: TestClient) -> None:
    payload = {
        "slots": [
            {
                "weekday": 1,
                "start_time": "10:00:00",
                "end_time": "11:30:00",
                "subject": "Mobile Systems Engineering",
                "room": "Hall 3B",
                "lecturer": "Prof. Android",
                "timetable_group_id": "default",
            },
            {
                "weekday": 3,
                "start_time": "14:00:00",
                "end_time": "15:30:00",
                "subject": "Distributed Systems",
                "room": "Lab 1",
                "lecturer": "Dr. Cloud",
                "timetable_group_id": "default",
            },
        ]
    }
    response = client.post("/api/timetable/sync", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "synchronized"
    assert data["synced_count"] == 2
    assert len(data["slots"]) == 2

    # Verify slots can be listed
    list_res = client.get("/api/timetable/slots")
    assert list_res.status_code == 200
    slots = list_res.json()
    assert len(slots) == 2
    assert any(s["subject"] == "Mobile Systems Engineering" for s in slots)


def test_timetable_extract_route(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from lecturewhisper.pipeline.timetable import TimetableImageParser
    monkeypatch.setattr(TimetableImageParser, "_load", lambda self: None)
    fake_img = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"\x00" * 50)
    files = {"image": ("timetable.png", fake_img, "image/png")}
    response = client.post("/api/timetable/extract", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "extracted"
    assert "slots" in data
    assert len(data["slots"]) >= 1


def test_recording_multipart_upload_route(client: TestClient) -> None:
    fake_audio = io.BytesIO(b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00")
    files = {"file": ("chunk_0000.wav", fake_audio, "audio/wav")}
    data = {
        "subject": "Advanced Artificial Intelligence",
        "timetable_slot_id": "",
        "device_id": "pixel-8a-test",
        "chunk_index": "0",
    }
    response = client.post("/api/recordings/upload", files=files, data=data)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "uploaded"
    assert res_data["subject"] == "Advanced Artificial Intelligence"
    assert "recording_id" in res_data
    assert "sha256" in res_data
