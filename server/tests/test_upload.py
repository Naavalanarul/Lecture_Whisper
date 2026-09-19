"""Integration tests for tus resumable upload protocol and device authentication."""

from __future__ import annotations

import base64
import hashlib
from typing import Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from lecturewhisper.api.app import create_app
from lecturewhisper.store.database import get_db
from lecturewhisper.store.models import RecordingRow


@pytest.fixture(name="client")
def client_fixture(tmp_path) -> Generator[TestClient, None, None]:
    """Create test client with in-memory database override."""
    test_db = f"sqlite:///{tmp_path}/test_upload.db"
    test_engine = create_engine(test_db, echo=False)
    SQLModel.metadata.create_all(test_engine)

    def override_get_db() -> Generator[Session, None, None]:
        with Session(test_engine) as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        yield client


def test_unpaired_device_rejected(client: TestClient) -> None:
    """Upload without valid paired device token must be rejected with 401."""
    # No auth header
    res_no_auth = client.post("/api/files/", headers={"Upload-Length": "1000"})
    assert res_no_auth.status_code == 401

    # Fake auth token
    res_fake_auth = client.post(
        "/api/files/",
        headers={"Upload-Length": "1000", "Authorization": "Bearer fake_token_123"},
    )
    assert res_fake_auth.status_code == 401


def test_interrupted_upload_resumes_correctly(client: TestClient) -> None:
    """Simulate interrupted upload and verify it resumes from saved offset."""
    # 1. Pair a test device
    info = client.get("/api/pairing/info").json()
    one_time_token = info["token"]
    pair_res = client.post(
        "/api/pairing/pair",
        json={
            "one_time_token": one_time_token,
            "device_id": "pixel_8a_test",
            "device_name": "My Pixel 8a",
        },
    ).json()
    device_token = pair_res["device_token"]
    auth_header = {"Authorization": f"Bearer {device_token}"}

    # 2. Prepare test payload (100 KB)
    chunk1 = b"A" * 50000
    chunk2 = b"B" * 50000
    full_payload = chunk1 + chunk2
    total_len = len(full_payload)
    sha256_hash = hashlib.sha256(full_payload).hexdigest()
    b64_sha = base64.b64encode(sha256_hash.encode()).decode()

    # 3. Create upload (TUS POST)
    post_headers = {
        **auth_header,
        "Upload-Length": str(total_len),
        "Upload-Metadata": f"sha256 {b64_sha},subject {base64.b64encode(b'Calculus II').decode()}",
    }
    create_res = client.post("/api/files/", headers=post_headers)
    assert create_res.status_code == 201
    upload_url = create_res.headers["Location"]

    # 4. Upload Chunk 1 (0 to 50,000 bytes)
    patch1_headers = {
        "Upload-Offset": "0",
        "Content-Type": "application/offset+octet-stream",
    }
    res_chunk1 = client.patch(upload_url, content=chunk1, headers=patch1_headers)
    assert res_chunk1.status_code == 204
    assert res_chunk1.headers["Upload-Offset"] == "50000"

    # --- SIMULATE NETWORK DROP ---

    # 5. Probe current offset via TUS HEAD request
    head_res = client.head(upload_url)
    assert head_res.status_code == 200
    assert head_res.headers["Upload-Offset"] == "50000"
    assert head_res.headers["Upload-Length"] == str(total_len)

    # 6. Resume: Upload Chunk 2 (50,000 to 100,000 bytes)
    patch2_headers = {
        "Upload-Offset": "50000",
        "Content-Type": "application/offset+octet-stream",
    }
    res_chunk2 = client.patch(upload_url, content=chunk2, headers=patch2_headers)
    assert res_chunk2.status_code == 204
    assert res_chunk2.headers["Upload-Offset"] == str(total_len)

    # 7. Verify recording was registered and queued
    recordings = client.get("/api/recordings/").json()
    assert len(recordings) >= 1
    rec = next(r for r in recordings if r["sha256"] == sha256_hash)
    assert rec["subject"] == "Calculus II"
    assert rec["status"] == "queued"
