"""Tests for mobile pairing v2, hello identity, and certificate fingerprinting."""

from datetime import UTC, datetime, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from lecturewhisper.api.app import create_app
from lecturewhisper.api.routes import pairing
from lecturewhisper.store.database import get_db


@pytest.fixture
def client(tmp_path):
    test_db = f"sqlite:///{tmp_path}/test_pairing.db"
    test_engine = create_engine(test_db, echo=False)
    SQLModel.metadata.create_all(test_engine)

    def override_get_db():
        with Session(test_engine) as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_hello_endpoint(client: TestClient):
    """Test server identity endpoint."""
    res = client.get("/api/v1/hello")
    assert res.status_code == 200
    data = res.json()
    assert "server_id" in data
    assert "name" in data
    assert data["version"] == "1.0.0"
    assert data["status"] == "ok"

    # Also test root alias
    res_root = client.get("/hello")
    assert res_root.status_code == 200
    assert res_root.json()["server_id"] == data["server_id"]


def test_pairing_info_endpoint(client: TestClient):
    """Test pairing info returns URI, 6-digit fallback, and TLS fingerprint."""
    res = client.get("/api/v1/pair/info")
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert "code_6digit" in data
    assert len(data["code_6digit"]) == 6
    assert data["code_6digit"].isdigit()
    assert "cert_fingerprint" in data
    assert "pairing_uri" in data
    assert data["pairing_uri"].startswith("lecturewhisper://pair?v=1&sid=")
    assert "t=" in data["pairing_uri"]
    assert "fp=" in data["pairing_uri"]
    assert "h=" in data["pairing_uri"]


def test_pairing_completion_with_token(client: TestClient):
    """Test successful pairing using UUID one-time token."""
    info_res = client.get("/api/v1/pair/info")
    assert info_res.status_code == 200
    token = info_res.json()["token"]

    complete_res = client.post(
        "/api/v1/pair/complete",
        json={
            "token": token,
            "device_id": "pixel-8a-unit-test-1",
            "device_name": "Google Pixel 8a",
        },
    )
    assert complete_res.status_code == 200
    data = complete_res.json()
    assert data["device_token"].startswith("lw_tok_")
    assert "server_id" in data
    assert len(data["address_candidates"]) > 0

    # Device should now be listed in registry
    devs_res = client.get("/api/v1/pair/devices")
    assert devs_res.status_code == 200
    devices = devs_res.json()
    assert any(d["device_id"] == "pixel-8a-unit-test-1" for d in devices)

    # Token must be single use: second call fails
    second_res = client.post(
        "/api/v1/pair/complete",
        json={
            "token": token,
            "device_id": "pixel-8a-unit-test-2",
            "device_name": "Google Pixel 8a #2",
        },
    )
    assert second_res.status_code == 400


def test_pairing_completion_with_fallback_code(client: TestClient):
    """Test successful pairing using the 6-digit fallback code."""
    info_res = client.get("/api/v1/pair/info")
    assert info_res.status_code == 200
    code_6digit = info_res.json()["code_6digit"]

    complete_res = client.post(
        "/api/v1/pair/complete",
        json={
            "token": code_6digit,
            "device_id": "pixel-8a-fallback-test",
            "device_name": "Pixel 8a Fallback",
        },
    )
    assert complete_res.status_code == 200
    data = complete_res.json()
    assert data["device_token"].startswith("lw_tok_")


def test_pairing_token_expiry(client: TestClient):
    """Test that expired tokens (> 2 minutes) are rejected."""
    # Inject expired token
    expired_tok = "expired-token-12345"
    old_time = datetime.now(UTC) - timedelta(seconds=130)
    pairing._active_pairing_tokens[expired_tok] = (old_time, "999999")

    complete_res = client.post(
        "/api/v1/pair/complete",
        json={
            "token": expired_tok,
            "device_id": "pixel-8a-expired",
            "device_name": "Pixel 8a Expired",
        },
    )
    assert complete_res.status_code == 400
    assert "expired" in complete_res.json()["detail"].lower()


def test_unpair_device(client: TestClient):
    """Test revoking a paired device."""
    info_res = client.get("/api/v1/pair/info")
    token = info_res.json()["token"]
    client.post(
        "/api/v1/pair/complete",
        json={
            "token": token,
            "device_id": "pixel-to-unpair",
            "device_name": "To Revoke",
        },
    )

    del_res = client.delete("/api/v1/pair/devices/pixel-to-unpair")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "unpaired"

    # Verify device no longer in list
    devs = client.get("/api/v1/pair/devices").json()
    assert not any(d["device_id"] == "pixel-to-unpair" for d in devs)
