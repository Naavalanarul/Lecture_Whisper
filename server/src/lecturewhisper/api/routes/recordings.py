"""Recording management routes backed by SQLite store."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from lecturewhisper.api.jobs import job_queue
from lecturewhisper.store.database import get_db
from lecturewhisper.store.files import FileStore
from lecturewhisper.store.models import (
    CorrectionRow,
    EventRow,
    JobRow,
    NotesRow,
    RecordingRow,
    TranscriptRow,
)

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


@router.get("/{recording_id}/audio")
async def get_audio(recording_id: UUID) -> FileResponse:
    """Stream audio for a recording if present on disk."""
    store = FileStore()
    audio_path = store.get_recording_path(recording_id)
    if not audio_path.exists():
        rec_dir = store._get_recording_dir(recording_id)
        for ext in ("*.wav", "*.m4a", "*.mp3", "*.aac", "*.ogg"):
            matches = list(rec_dir.glob(ext))
            if matches:
                audio_path = matches[0]
                break
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    media_type = "audio/wav" if audio_path.suffix == ".wav" else "audio/mp4"
    return FileResponse(audio_path, media_type=media_type)


class UpdateEventRequest(BaseModel):
    resolved: bool | None = None
    needs_review: bool | None = None
    title: str | None = None
    date_iso: str | None = None


@router.get("/{recording_id}/events")
async def get_events(recording_id: UUID, db: Session = Depends(get_db)) -> list[dict]:
    """Get detected events for this recording."""
    events = db.exec(select(EventRow).where(EventRow.recording_id == recording_id)).all()
    return [e.model_dump(mode="json") for e in events]


@router.patch("/{recording_id}/events/{event_id}")
async def update_event(
    recording_id: UUID,
    event_id: UUID,
    req: UpdateEventRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Update event status (confirm, edit date, dismiss)."""
    event = db.get(EventRow, event_id)
    if not event or event.recording_id != recording_id:
        raise HTTPException(status_code=404, detail="Event not found")
    if req.resolved is not None:
        event.resolved = req.resolved
    if req.needs_review is not None:
        event.needs_review = req.needs_review
    if req.title is not None:
        event.title = req.title
    if req.date_iso is not None:
        event.date_iso = req.date_iso
    db.add(event)
    db.commit()
    db.refresh(event)
    return event.model_dump(mode="json")


class CreateCorrectionRequest(BaseModel):
    field: str
    original_value: str
    corrected_value: str


@router.get("/{recording_id}/corrections")
async def get_corrections(recording_id: UUID, db: Session = Depends(get_db)) -> list[dict]:
    """Get human corrections for this recording."""
    corrections = db.exec(
        select(CorrectionRow).where(CorrectionRow.recording_id == recording_id)
    ).all()
    return [c.model_dump(mode="json") for c in corrections]


@router.post("/{recording_id}/corrections")
async def add_correction(
    recording_id: UUID,
    req: CreateCorrectionRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Record a human correction to feed LoRA fine-tuning."""
    corr = CorrectionRow(
        id=uuid4(),
        recording_id=recording_id,
        field=req.field,
        original_value=req.original_value,
        corrected_value=req.corrected_value,
        created_at=datetime.now(UTC),
    )
    db.add(corr)
    db.commit()
    db.refresh(corr)
    return corr.model_dump(mode="json")


@router.post("/upload")
async def upload_recording(
    file: UploadFile = File(...),
    subject: str = Form(default="Lecture Session"),
    timetable_slot_id: str | None = Form(default=None),
    device_id: str = Form(default="mobile-pixel8a"),
    chunk_index: int = Form(default=0),
    db: Session = Depends(get_db),
) -> dict:
    """Direct multipart audio upload endpoint for mobile client."""
    rec_id = uuid4()
    file_bytes = await file.read()
    sha256 = hashlib.sha256(file_bytes).hexdigest()

    # Save audio file
    store = FileStore()
    audio_path = store.save_recording(rec_id, file_bytes)

    # Parse slot ID if provided
    parsed_slot_id: UUID | None = None
    if timetable_slot_id and timetable_slot_id.strip():
        try:
            parsed_slot_id = UUID(timetable_slot_id.strip())
        except Exception:
            parsed_slot_id = None

    rec = RecordingRow(
        id=rec_id,
        device_id=device_id,
        started_at=datetime.now(UTC),
        duration_s=0.0,
        timetable_slot_id=parsed_slot_id,
        subject=subject or "Lecture Session",
        sha256=sha256,
        chunk_count=1,
        status="uploaded",
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    # Submit job for processing
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

    return {
        "status": "uploaded",
        "recording_id": str(rec_id),
        "job_id": str(job.id),
        "sha256": sha256,
        "subject": rec.subject,
        "timetable_slot_id": str(rec.timetable_slot_id) if rec.timetable_slot_id else None,
    }

