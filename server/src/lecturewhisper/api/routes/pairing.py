"""Pairing routes for mobile app authentication."""

from __future__ import annotations

import socket
from datetime import UTC, datetime
from secrets import token_hex
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from lecturewhisper.config import get_settings
from lecturewhisper.store.database import get_db
from lecturewhisper.store.models import PairedDeviceRow

router = APIRouter(prefix="/pairing", tags=["pairing"])

# Active one-time pairing token
_active_pairing_tokens: dict[str, datetime] = {}


class PairRequest(BaseModel):
    one_time_token: str
    device_id: str
    device_name: str


class PairResponse(BaseModel):
    device_token: str
    server_id: str
    paired_at: datetime


def get_or_create_one_time_token() -> str:
    """Generate a 6-character or UUID one-time token."""
    tok = str(uuid4())
    _active_pairing_tokens[tok] = datetime.now(UTC)
    return tok


@router.get("/info")
async def get_pairing_info() -> dict:
    """Get pairing info including one-time token and host details."""
    settings = get_settings()
    hostname = socket.gethostname()
    try:
        local_ip = socket.gethostbyname(hostname)
    except Exception:
        local_ip = "127.0.0.1"

    token = get_or_create_one_time_token()
    import hashlib
    fp = hashlib.sha256(f"{hostname}:{settings.server.port}:{token}".encode()).hexdigest()[:32]
    return {
        "host": local_ip,
        "port": settings.server.port,
        "token": token,
        "server_id": hostname,
        "cert_fingerprint": fp,
        "pairing_uri": f"lw://pair?host={local_ip}&port={settings.server.port}&token={token}&fp={fp}",
    }


@router.post("/pair", response_model=PairResponse)
async def pair_device(req: PairRequest, db: Session = Depends(get_db)) -> PairResponse:
    """Pair a device using a valid one-time token."""
    if req.one_time_token not in _active_pairing_tokens:
        raise HTTPException(status_code=400, detail="Invalid or expired one-time pairing token")

    # Invalidate token after use
    _active_pairing_tokens.pop(req.one_time_token, None)

    # Generate long-lived token
    device_token = f"lw_tok_{token_hex(24)}"
    hostname = socket.gethostname()

    # Check if device already paired
    existing = db.exec(select(PairedDeviceRow).where(PairedDeviceRow.device_id == req.device_id)).first()
    if existing:
        existing.token = device_token
        existing.device_name = req.device_name
        existing.paired_at = datetime.now(UTC)
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return PairResponse(
            device_token=device_token,
            server_id=hostname,
            paired_at=existing.paired_at,
        )

    device_row = PairedDeviceRow(
        device_id=req.device_id,
        device_name=req.device_name,
        token=device_token,
        paired_at=datetime.now(UTC),
    )
    db.add(device_row)
    db.commit()
    db.refresh(device_row)

    return PairResponse(
        device_token=device_token,
        server_id=hostname,
        paired_at=device_row.paired_at,
    )


@router.get("/devices")
async def list_paired_devices(db: Session = Depends(get_db)) -> list[dict]:
    """List all paired devices."""
    devices = db.exec(select(PairedDeviceRow)).all()
    return [
        {
            "device_id": d.device_id,
            "device_name": d.device_name,
            "paired_at": d.paired_at.isoformat(),
        }
        for d in devices
    ]


@router.delete("/devices/{device_id}")
async def unpair_device(device_id: str, db: Session = Depends(get_db)) -> dict:
    """Unpair and revoke access for a device."""
    device = db.exec(select(PairedDeviceRow).where(PairedDeviceRow.device_id == device_id)).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    db.delete(device)
    db.commit()
    return {"status": "unpaired", "device_id": device_id}
