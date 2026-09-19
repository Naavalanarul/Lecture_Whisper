from __future__ import annotations

from datetime import datetime, UTC
from typing import Optional
from uuid import UUID, uuid4

import sqlalchemy as sa
from sqlmodel import Field, SQLModel, Column

class RecordingRow(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    device_id: str
    started_at: datetime
    duration_s: float
    timetable_slot_id: Optional[UUID] = Field(default=None, foreign_key="timetableslotrow.id")
    subject: Optional[str] = Field(default=None)
    sha256: str = Field(unique=True)
    chunk_count: int
    status: str

class JobRow(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    recording_id: UUID = Field(foreign_key="recordingrow.id")
    status: str
    stage: str
    progress: float
    error: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

class TimetableSlotRow(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    weekday: int
    start_time: str
    end_time: str
    subject: str
    room: Optional[str] = Field(default=None)
    lecturer: Optional[str] = Field(default=None)
    timetable_group_id: str

class PairedDeviceRow(SQLModel, table=True):
    device_id: str = Field(primary_key=True)
    device_name: str
    token: str = Field(unique=True)
    paired_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

class TranscriptRow(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    recording_id: UUID = Field(foreign_key="recordingrow.id", unique=True)
    data: str = Field(sa_column=Column(sa.Text)) # JSON text
    asr_model: str
    language: Optional[str] = Field(default=None)

class NotesRow(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    recording_id: UUID = Field(foreign_key="recordingrow.id", unique=True)
    data: str = Field(sa_column=Column(sa.Text)) # JSON text

class EventRow(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    recording_id: UUID = Field(foreign_key="recordingrow.id")
    type: str
    title: str
    date_iso: Optional[str] = Field(default=None)
    date_text: str
    resolved: bool = Field(default=False)
    confidence: float
    source_quote: Optional[str] = Field(default=None)
    start_s: Optional[float] = Field(default=None)
    needs_review: bool = Field(default=False)

class CorrectionRow(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    recording_id: UUID = Field(foreign_key="recordingrow.id")
    field: str
    original_value: str = Field(sa_column=Column(sa.Text))
    corrected_value: str = Field(sa_column=Column(sa.Text))
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
