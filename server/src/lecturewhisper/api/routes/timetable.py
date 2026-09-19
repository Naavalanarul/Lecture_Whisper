"""Timetable management routes backed by SQLite store."""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
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
