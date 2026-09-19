"""tus v1.0.0 Resumable Upload protocol implementation with sha256 verification and device auth."""

from __future__ import annotations

import base64
import hashlib
import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from sqlmodel import Session, select

from lecturewhisper.api.jobs import job_queue
from lecturewhisper.config import get_settings
from lecturewhisper.store.database import get_db
from lecturewhisper.store.models import JobRow, PairedDeviceRow, RecordingRow

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/files", tags=["upload"])


def _get_storage_dir() -> Path:
    settings = get_settings()
    dir_path = settings.data_dir / "storage" / "recordings"
    dir_path.mkdir(parents=True, exist_ok=True)
    return dir_path


def _get_metadata_dir() -> Path:
    settings = get_settings()
    dir_path = settings.data_dir / "storage" / "upload_meta"
    dir_path.mkdir(parents=True, exist_ok=True)
    return dir_path


def verify_device_token(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> PairedDeviceRow:
    """Validate Bearer token against paired devices in SQLite."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized: missing device token")

    token = authorization.removeprefix("Bearer ").strip()
    device = db.exec(select(PairedDeviceRow).where(PairedDeviceRow.token == token)).first()
    if not device:
        raise HTTPException(status_code=401, detail="Unauthorized: invalid or revoked device token")

    return device


@router.options("/")
@router.options("/{upload_id}")
async def tus_options() -> Response:
    """TUS protocol capabilities discovery."""
    headers = {
        "Tus-Resumable": "1.0.0",
        "Tus-Version": "1.0.0",
        "Tus-Extension": "creation,termination",
        "Tus-Max-Size": str(1024 * 1024 * 1024),  # 1 GB
    }
    return Response(status_code=204, headers=headers)


@router.post("/")
async def create_upload(
    request: Request,
    upload_length: int = Header(alias="Upload-Length"),
    upload_metadata: str | None = Header(default=None, alias="Upload-Metadata"),
    device: PairedDeviceRow = Depends(verify_device_token),
) -> Response:
    """TUS Creation: Register a new resumable upload."""
    upload_id = str(uuid4())
    meta_dict: dict[str, str] = {}

    if upload_metadata:
        for part in upload_metadata.split(","):
            if " " in part.strip():
                k, v = part.strip().split(" ", 1)
                try:
                    meta_dict[k] = base64.b64decode(v).decode("utf-8")
                except Exception:
                    meta_dict[k] = v

    meta_file = _get_metadata_dir() / f"{upload_id}.json"
    meta_info = {
        "upload_id": upload_id,
        "device_id": device.device_id,
        "upload_length": upload_length,
        "offset": 0,
        "metadata": meta_dict,
        "created_at": datetime.now(UTC).isoformat(),
    }
    meta_file.write_text(json.dumps(meta_info), encoding="utf-8")

    # Create empty target file
    target_file = _get_storage_dir() / f"{upload_id}.bin"
    target_file.touch()

    headers = {
        "Location": f"/api/files/{upload_id}",
        "Tus-Resumable": "1.0.0",
    }
    return Response(status_code=201, headers=headers)


@router.head("/{upload_id}")
async def probe_upload(upload_id: str) -> Response:
    """TUS Head: Probe current upload offset for resumption."""
    meta_file = _get_metadata_dir() / f"{upload_id}.json"
    target_file = _get_storage_dir() / f"{upload_id}.bin"

    if not meta_file.exists() or not target_file.exists():
        raise HTTPException(status_code=404, detail="Upload not found")

    meta = json.loads(meta_file.read_text(encoding="utf-8"))
    current_offset = target_file.stat().st_size

    headers = {
        "Upload-Offset": str(current_offset),
        "Upload-Length": str(meta["upload_length"]),
        "Tus-Resumable": "1.0.0",
        "Cache-Control": "no-store",
    }
    return Response(status_code=200, headers=headers)


@router.patch("/{upload_id}")
async def upload_chunk(
    upload_id: str,
    request: Request,
    upload_offset: int = Header(alias="Upload-Offset"),
    content_type: str = Header(alias="Content-Type"),
    db: Session = Depends(get_db),
) -> Response:
    """TUS Patch: Upload a chunk to append to the file."""
    if "application/offset+octet-stream" not in content_type:
        raise HTTPException(status_code=415, detail="Unsupported media type for TUS PATCH")

    meta_file = _get_metadata_dir() / f"{upload_id}.json"
    target_file = _get_storage_dir() / f"{upload_id}.bin"

    if not meta_file.exists() or not target_file.exists():
        raise HTTPException(status_code=404, detail="Upload not found")

    meta = json.loads(meta_file.read_text(encoding="utf-8"))
    current_size = target_file.stat().st_size

    if upload_offset != current_size:
        raise HTTPException(status_code=409, detail=f"Offset mismatch: expected {current_size}, got {upload_offset}")

    chunk_data = await request.body()
    with open(target_file, "ab") as f:
        f.write(chunk_data)

    new_offset = target_file.stat().st_size
    meta["offset"] = new_offset
    meta_file.write_text(json.dumps(meta), encoding="utf-8")

    # If upload is complete, verify sha256 and register recording
    if new_offset == meta["upload_length"]:
        logger.info("Upload %s completed! Verifying sha256...", upload_id)
        hasher = hashlib.sha256()
        with open(target_file, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        calc_sha256 = hasher.hexdigest()

        expected_sha = meta["metadata"].get("sha256")
        if expected_sha and expected_sha != calc_sha256:
            logger.error("SHA256 mismatch for upload %s: calc=%s, expected=%s", upload_id, calc_sha256, expected_sha)
            raise HTTPException(status_code=400, detail="SHA256 checksum verification failed")

        # Idempotency check: Check if same sha256 already exists
        existing_rec = db.exec(select(RecordingRow).where(RecordingRow.sha256 == calc_sha256)).first()
        if existing_rec:
            logger.warning("Recording with sha256 %s already exists: %s", calc_sha256, existing_rec.id)
            return Response(status_code=204, headers={"Upload-Offset": str(new_offset), "Tus-Resumable": "1.0.0"})

        # Rename to final recording file
        rec_id = UUID(upload_id)
        final_audio_path = _get_storage_dir() / f"{upload_id}.wav"
        target_file.rename(final_audio_path)

        # Register in SQLite
        rec_row = RecordingRow(
            id=rec_id,
            device_id=meta["device_id"],
            started_at=datetime.now(UTC),
            duration_s=float(meta["metadata"].get("duration_s", 0.0)),
            subject=meta["metadata"].get("subject", "Uncategorized Lecture"),
            sha256=calc_sha256,
            chunk_count=int(meta["metadata"].get("chunk_count", 1)),
            status="queued",
        )
        db.add(rec_row)
        db.commit()

        # Enqueue processing
        job = await job_queue.submit(rec_id)
        job_row = JobRow(
            id=job.id,
            recording_id=rec_id,
            status=job.status.value,
            stage="queued",
            progress=0.0,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db.add(job_row)
        db.commit()

    headers = {
        "Upload-Offset": str(new_offset),
        "Tus-Resumable": "1.0.0",
    }
    return Response(status_code=204, headers=headers)
