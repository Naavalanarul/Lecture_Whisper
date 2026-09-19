"""Integration tests for FastAPI application and API routes."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from lecturewhisper.api.app import create_app
from lecturewhisper.store.database import get_db


@pytest.fixture(name="client")
def client_fixture(tmp_path) -> Generator[TestClient, None, None]:
    """Create test client with in-memory database override."""
    test_db = f"sqlite:///{tmp_path}/test.db"
    test_engine = create_engine(test_db, echo=False)
    SQLModel.metadata.create_all(test_engine)

    def override_get_db() -> Generator[Session, None, None]:
        with Session(test_engine) as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        yield client


def test_health_check(client: TestClient) -> None:
    """Health endpoint should return 200 OK with service name."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "lecturewhisper"


def test_static_ui_served(client: TestClient) -> None:
    """Root URL should serve the static HTML dashboard."""
    response = client.get("/")
    assert response.status_code == 200
    assert "Lecture Whisper" in response.text


def test_pairing_flow(client: TestClient) -> None:
    """Device should be able to get pairing info and pair with valid one-time token."""
    # 1. Get pairing info
    info_resp = client.get("/api/pairing/info")
    assert info_resp.status_code == 200
    info = info_resp.json()
    assert "token" in info
    assert "port" in info
    token = info["token"]

    # 2. Attempt with invalid token
    bad_resp = client.post(
        "/api/pairing/pair",
        json={"one_time_token": "invalid_tok", "device_id": "px8a_123", "device_name": "Pixel 8a"},
    )
    assert bad_resp.status_code == 400

    # 3. Pair with valid token
    pair_resp = client.post(
        "/api/pairing/pair",
        json={"one_time_token": token, "device_id": "px8a_123", "device_name": "Pixel 8a"},
    )
    assert pair_resp.status_code == 200
    pair_data = pair_resp.json()
    assert pair_data["device_token"].startswith("lw_tok_")

    # 4. Token cannot be reused
    reuse_resp = client.post(
        "/api/pairing/pair",
        json={"one_time_token": token, "device_id": "px8a_123", "device_name": "Pixel 8a"},
    )
    assert reuse_resp.status_code == 400

    # 5. List paired devices
    dev_resp = client.get("/api/pairing/devices")
    assert dev_resp.status_code == 200
    devices = dev_resp.json()
    assert len(devices) == 1
    assert devices[0]["device_id"] == "px8a_123"


def test_timetable_crud(client: TestClient) -> None:
    """Should be able to create, list, and delete timetable slots."""
    # List initially empty
    resp = client.get("/api/timetable/slots")
    assert resp.status_code == 200
    assert resp.json() == []

    # Create slot
    slot_payload = {
        "weekday": 0,
        "start_time": "09:00",
        "end_time": "10:30",
        "subject": "CS50 Introduction to Computer Science",
        "room": "Hall B",
        "lecturer": "Dr. Smith",
    }
    create_resp = client.post("/api/timetable/slots", json=slot_payload)
    assert create_resp.status_code == 200
    created = create_resp.json()
    slot_id = created["id"]
    assert created["subject"] == "CS50 Introduction to Computer Science"

    # List shows created slot
    list_resp = client.get("/api/timetable/slots")
    assert len(list_resp.json()) == 1

    # Delete slot
    del_resp = client.delete(f"/api/timetable/slots/{slot_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "deleted"

    # List empty again
    assert len(client.get("/api/timetable/slots").json()) == 0


def test_recordings_and_jobs_flow(client: TestClient) -> None:
    """Should register recording, retrieve it, queue processing job, and view job status."""
    recording_id = str(uuid4())
    payload = {
        "device_id": "px8a_123",
        "started_at": datetime.now(UTC).isoformat(),
        "duration_s": 3600.0,
        "subject": "Quantum Computing",
        "sha256": "fake_sha256_hash_12345",
        "chunk_count": 6,
    }

    # Register recording
    reg_resp = client.post("/api/recordings/", json=payload)
    assert reg_resp.status_code == 200
    rec = reg_resp.json()
    rec_id = rec["id"]

    # Get recording
    get_resp = client.get(f"/api/recordings/{rec_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["subject"] == "Quantum Computing"

    # Queue processing
    proc_resp = client.post(f"/api/recordings/{rec_id}/process")
    assert proc_resp.status_code == 200
    job_info = proc_resp.json()
    assert "job_id" in job_info

    # Check jobs list
    jobs_resp = client.get("/api/jobs/")
    assert jobs_resp.status_code == 200
    jobs = jobs_resp.json()
    assert len(jobs) >= 1
