"""Recording management routes backed by SQLite store."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from lecturewhisper.api.jobs import job_queue
from lecturewhisper.store.database import get_db
from lecturewhisper.store.models import JobRow, NotesRow, RecordingRow, TranscriptRow

router = APIRouter(prefix="/recordings", tags=["recordings"])


class CreateRecordingRequest(BaseModel):
    device_id: str
    started_at: datetime
    duration_s: float
    timetable_slot_id: UUID | None = None
    subject: str | None = None
    sha256: str
    chunk_count: int


@router.get("/")
async def list_recordings(db: Session = Depends(get_db)) -> list[dict]:
    """List all recordings in the database."""
    recordings = db.exec(select(RecordingRow).order_by(RecordingRow.started_at.desc())).all()
    return [r.model_dump(mode="json") for r in recordings]


@router.post("/")
async def create_recording(req: CreateRecordingRequest, db: Session = Depends(get_db)) -> dict:
    """Register or save recording metadata."""
    existing = db.exec(select(RecordingRow).where(RecordingRow.sha256 == req.sha256)).first()
    if existing:
        return existing.model_dump(mode="json")

    rec = RecordingRow(
        id=uuid4(),
        device_id=req.device_id,
        started_at=req.started_at,
        duration_s=req.duration_s,
        timetable_slot_id=req.timetable_slot_id,
        subject=req.subject,
        sha256=req.sha256,
        chunk_count=req.chunk_count,
        status="uploaded",
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec.model_dump(mode="json")


@router.get("/{recording_id}")
async def get_recording(recording_id: UUID, db: Session = Depends(get_db)) -> dict:
    """Get details for a specific recording."""
    rec = db.get(RecordingRow, recording_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recording not found")
    return rec.model_dump(mode="json")


@router.get("/{recording_id}/transcript")
async def get_transcript(recording_id: UUID, db: Session = Depends(get_db)) -> dict:
    """Get transcript for a recording if available."""
    t_row = db.exec(select(TranscriptRow).where(TranscriptRow.recording_id == recording_id)).first()
    if not t_row:
        raise HTTPException(status_code=404, detail="Transcript not found for this recording")
    return {
        "recording_id": str(recording_id),
        "asr_model": t_row.asr_model,
        "language": t_row.language,
        "transcript": json.loads(t_row.data),
    }


@router.get("/{recording_id}/notes")
async def get_notes(recording_id: UUID, db: Session = Depends(get_db)) -> dict:
    """Get notes for a recording if available."""
    n_row = db.exec(select(NotesRow).where(NotesRow.recording_id == recording_id)).first()
    if not n_row:
        raise HTTPException(status_code=404, detail="Notes not found for this recording")
    return {
        "recording_id": str(recording_id),
        "notes": json.loads(n_row.data),
    }


@router.post("/{recording_id}/process")
async def process_recording(recording_id: UUID, db: Session = Depends(get_db)) -> dict:
    """Queue a recording for processing."""
    rec = db.get(RecordingRow, recording_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recording not found")

    rec.status = "queued"
    db.add(rec)
    db.commit()

    job = await job_queue.submit(recording_id)

    # Persist job record in DB
    job_row = JobRow(
        id=job.id,
        recording_id=recording_id,
        status=job.status.value,
        stage="queued",
        progress=0.0,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    db.add(job_row)
    db.commit()

    return {"job_id": str(job.id), "status": job.status}
