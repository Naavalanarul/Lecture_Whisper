"""Pairing and identity routes for mobile app authentication."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
import hashlib
from secrets import randbelow, token_hex
import socket
from typing import List
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import Session, select

from lecturewhisper.config import get_settings
from lecturewhisper.security.tls import (
    get_address_candidates,
    get_cert_fingerprint_base64url,
)
from lecturewhisper.store.database import get_db
from lecturewhisper.store.models import PairedDeviceRow

router = APIRouter(tags=["pairing"])

# Active one-time pairing tokens: {token_string: (created_at_utc, fallback_code)}
_active_pairing_tokens: dict[str, tuple[datetime, str]] = {}
# Rate limiting for pairing attempts: {ip: [timestamps]}
_pairing_attempts: dict[str, list[datetime]] = {}

TOKEN_TTL_SECONDS = 120  # 2 minutes expiry


class PairRequest(BaseModel):
    one_time_token: str
    device_id: str
    device_name: str


class PairResponse(BaseModel):
    device_token: str
    server_id: str
    paired_at: datetime


class PairCompleteRequest(BaseModel):
    token: str
    device_id: str
    device_name: str


class PairCompleteResponse(BaseModel):
    device_token: str
    mac_name: str
    server_id: str
    address_candidates: List[str]


class HelloResponse(BaseModel):
    server_id: str
    name: str
    version: str
    status: str = "ok"


def _check_rate_limit(client_ip: str) -> None:
    now = datetime.now(UTC)
    cutoff = now - timedelta(minutes=1)
    attempts = [t for t in _pairing_attempts.get(client_ip, []) if t > cutoff]
    if len(attempts) >= 10:
        raise HTTPException(
            status_code=429,
            detail="Too many pairing attempts. Please wait 1 minute before retrying.",
        )
    attempts.append(now)
    _pairing_attempts[client_ip] = attempts


def _prune_expired_tokens() -> None:
    now = datetime.now(UTC)
    expired = [
        tok
        for tok, (created, _) in _active_pairing_tokens.items()
        if (now - created).total_seconds() > TOKEN_TTL_SECONDS
    ]
    for tok in expired:
        _active_pairing_tokens.pop(tok, None)


def get_or_create_one_time_token() -> tuple[str, str, int]:
    """Generate or retrieve a fresh 2-minute pairing token and 6-digit code."""
    _prune_expired_tokens()
    tok = str(uuid4())
    code_6digit = f"{randbelow(900000) + 100000}"
    now = datetime.now(UTC)
    _active_pairing_tokens[tok] = (now, code_6digit)
    exp_unix = int((now + timedelta(seconds=TOKEN_TTL_SECONDS)).timestamp())
    return tok, code_6digit, exp_unix


# =====================================================================
# Identity Endpoints: GET /api/v1/hello and GET /hello
# =====================================================================


@router.get("/v1/hello", response_model=HelloResponse)
@router.get("/hello", response_model=HelloResponse)
async def get_hello() -> HelloResponse:
    """Returns server identity, server ID, and version for connection verification."""
    hostname = socket.gethostname()
    return HelloResponse(
        server_id=hostname,
        name=hostname,
        version="1.0.0",
        status="ok",
    )


# =====================================================================
# Pairing Info & Discovery: GET /pairing/info and GET /v1/pair/info
# =====================================================================


@router.get("/pairing/info")
@router.get("/v1/pair/info")
async def get_pairing_info() -> dict:
    """Get pairing information, QR URI, fallback code, and TLS fingerprint."""
    settings = get_settings()
    hostname = socket.gethostname()
    candidates = get_address_candidates()
    token, code_6digit, exp_unix = get_or_create_one_time_token()

    try:
        fp = get_cert_fingerprint_base64url()
    except Exception:
        fp = hashlib.sha256(
            f"{hostname}:{settings.server.port}:{token}".encode()
        ).hexdigest()[:32]

    ips_joined = ",".join(candidates)
    pairing_uri = (
        f"lecturewhisper://pair?v=1&sid={hostname}&n={hostname}&h={ips_joined}"
        f"&p={settings.server.port}&fp={fp}&t={token}&exp={exp_unix}"
    )

    return {
        "host": candidates[0] if candidates else "127.0.0.1",
        "port": settings.server.port,
        "token": token,
        "code_6digit": code_6digit,
        "server_id": hostname,
        "mac_name": hostname,
        "cert_fingerprint": fp,
        "expires_in": TOKEN_TTL_SECONDS,
        "expires_at_unix": exp_unix,
        "address_candidates": candidates,
        "pairing_uri": pairing_uri,
    }


# =====================================================================
# Pairing Completion: POST /api/v1/pair/complete and legacy POST /pairing/pair
# =====================================================================


@router.post("/v1/pair/complete", response_model=PairCompleteResponse)
@router.post("/pairing/complete", response_model=PairCompleteResponse)
async def pair_complete(
    req: PairCompleteRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> PairCompleteResponse:
    """Complete pairing from mobile app QR code scan or 6-digit code fallback."""
    client_ip = request.client.host if request.client else "127.0.0.1"
    _check_rate_limit(client_ip)
    _prune_expired_tokens()

    # Match token either by UUID token or by 6-digit fallback code
    matched_token: str | None = None
    for tok, (created, code) in list(_active_pairing_tokens.items()):
        if req.token == tok or req.token == code:
            if (datetime.now(UTC) - created).total_seconds() <= TOKEN_TTL_SECONDS:
                matched_token = tok
                break

    if not matched_token:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired pairing token. Please scan the fresh QR code on your Mac.",
        )

    # Invalidate token (single use)
    _active_pairing_tokens.pop(matched_token, None)

    # Generate long-lived cryptographically secure device token
    device_token = f"lw_tok_{token_hex(24)}"
    token_hash = hashlib.sha256(device_token.encode()).hexdigest()
    hostname = socket.gethostname()
    candidates = get_address_candidates()

    # Check if device already exists in registry
    existing = db.exec(
        select(PairedDeviceRow).where(PairedDeviceRow.device_id == req.device_id)
    ).first()
    if existing:
        existing.token = token_hash
        existing.device_name = req.device_name
        existing.paired_at = datetime.now(UTC)
        db.add(existing)
        db.commit()
    else:
        device_row = PairedDeviceRow(
            device_id=req.device_id,
            device_name=req.device_name,
            token=token_hash,
            paired_at=datetime.now(UTC),
        )
        db.add(device_row)
        db.commit()

    return PairCompleteResponse(
        device_token=device_token,
        mac_name=hostname,
        server_id=hostname,
        address_candidates=candidates,
    )


@router.post("/pairing/pair", response_model=PairResponse)
async def pair_device_legacy(
    req: PairRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> PairResponse:
    """Legacy pair endpoint for backward compatibility."""
    res = await pair_complete(
        PairCompleteRequest(
            token=req.one_time_token,
            device_id=req.device_id,
            device_name=req.device_name,
        ),
        request,
        db,
    )
    return PairResponse(
        device_token=res.device_token,
        server_id=res.server_id,
        paired_at=datetime.now(UTC),
    )


# =====================================================================
# Device Registry: GET /pairing/devices and DELETE /pairing/devices/{id}
# =====================================================================


@router.get("/pairing/devices")
@router.get("/v1/pair/devices")
async def list_paired_devices(db: Session = Depends(get_db)) -> list[dict]:
    """List all authorized paired mobile devices."""
    devices = db.exec(select(PairedDeviceRow)).all()
    return [
        {
            "device_id": d.device_id,
            "device_name": d.device_name,
            "paired_at": d.paired_at.isoformat(),
        }
        for d in devices
    ]


@router.delete("/pairing/devices/{device_id}")
@router.delete("/v1/pair/devices/{device_id}")
async def unpair_device(device_id: str, db: Session = Depends(get_db)) -> dict:
    """Unpair and revoke authorization for a mobile device."""
    device = db.exec(
        select(PairedDeviceRow).where(PairedDeviceRow.device_id == device_id)
    ).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found in registry")
    db.delete(device)
    db.commit()
    return {"status": "unpaired", "device_id": device_id}
