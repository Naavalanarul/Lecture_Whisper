"""Timetable management routes backed by SQLite store."""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlmodel import Session, select

from lecturewhisper.store.database import get_db
from lecturewhisper.store.models import TimetableSlotRow

router = APIRouter(prefix="/timetable", tags=["timetable"])


class TimetableSlotCreate(BaseModel):
    weekday: int  # 0 = Monday, 6 = Sunday
    start_time: str
    end_time: str
    subject: str
    room: str | None = None
    lecturer: str | None = None
    timetable_group_id: str = "default"


@router.get("/slots")
async def list_slots(db: Session = Depends(get_db)) -> list[dict]:
    """List all timetable slots."""
    slots = db.exec(select(TimetableSlotRow).order_by(TimetableSlotRow.weekday, TimetableSlotRow.start_time)).all()
    return [s.model_dump(mode="json") for s in slots]


@router.post("/slots")
async def create_slot(slot: TimetableSlotCreate, db: Session = Depends(get_db)) -> dict:
    """Create a new timetable slot."""
    slot_row = TimetableSlotRow(
        id=uuid4(),
        weekday=slot.weekday,
        start_time=slot.start_time,
        end_time=slot.end_time,
        subject=slot.subject,
        room=slot.room,
        lecturer=slot.lecturer,
        timetable_group_id=slot.timetable_group_id,
    )
    db.add(slot_row)
    db.commit()
    db.refresh(slot_row)
    return slot_row.model_dump(mode="json")


@router.delete("/slots/{slot_id}")
async def delete_slot(slot_id: UUID, db: Session = Depends(get_db)) -> dict:
    """Delete a timetable slot by ID."""
    slot = db.get(TimetableSlotRow, slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    db.delete(slot)
    db.commit()
    return {"status": "deleted", "slot_id": str(slot_id)}


class TimetableSyncPayload(BaseModel):
    slots: list[TimetableSlotCreate]


@router.post("/sync")
async def sync_slots(payload: TimetableSyncPayload, db: Session = Depends(get_db)) -> dict:
    """Sync timetable slots from mobile app. Upserts slots into the database."""
    # Clear previous slots in the default group to keep schedule synchronized
    db.exec(select(TimetableSlotRow)).all()
    # Replace slots for default group
    for s in db.exec(select(TimetableSlotRow).where(TimetableSlotRow.timetable_group_id == "default")).all():
        db.delete(s)
    db.commit()

    created_slots = []
    for slot in payload.slots:
        slot_row = TimetableSlotRow(
            id=uuid4(),
            weekday=slot.weekday,
            start_time=slot.start_time,
            end_time=slot.end_time,
            subject=slot.subject,
            room=slot.room,
            lecturer=slot.lecturer,
            timetable_group_id=slot.timetable_group_id,
        )
        db.add(slot_row)
        created_slots.append(slot_row)

    db.commit()
    for s in created_slots:
        db.refresh(s)

    return {
        "status": "synchronized",
        "synced_count": len(created_slots),
        "slots": [s.model_dump(mode="json") for s in created_slots],
    }


@router.post("/extract")
async def extract_timetable(
    image: UploadFile | None = File(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
) -> dict:
    """Extract timetable schedule from an uploaded image using local OCR / VLM."""
    import tempfile
    from pathlib import Path
    from lecturewhisper.pipeline.timetable import TimetableImageParser

    target_file = image or file
    if not target_file:
        raise HTTPException(status_code=400, detail="No image file provided")

    suffix = Path(target_file.filename or "timetable.png").suffix or ".png"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        contents = await target_file.read()
        tmp.write(contents)
        tmp_path = Path(tmp.name)

    try:
        parser = TimetableImageParser()
        result = parser.parse_image(tmp_path)

        created_rows = []
        for slot in result.slots:
            slot_row = TimetableSlotRow(
                id=slot.id or uuid4(),
                weekday=slot.weekday,
                start_time=str(slot.start),
                end_time=str(slot.end),
                subject=slot.subject,
                room=slot.room,
                lecturer=slot.lecturer,
                timetable_group_id="default",
            )
            db.add(slot_row)
            created_rows.append(slot_row)

        db.commit()
        for s in created_rows:
            db.refresh(s)

        return {
            "status": "extracted",
            "slots": [s.model_dump(mode="json") for s in created_rows],
            "count": len(created_rows),
        }
    finally:
        if tmp_path.exists():
            tmp_path.unlink()
