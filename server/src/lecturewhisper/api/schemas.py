from __future__ import annotations

import json
import os
from datetime import datetime, time
from enum import Enum
from typing import List, Literal, Optional, Tuple
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RecordingStatus(str, Enum):
    uploading = "uploading"
    queued = "queued"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class Recording(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    device_id: str
    started_at: datetime
    duration_s: float
    timetable_slot_id: Optional[UUID] = None
    subject: Optional[str] = None
    sha256: str
    chunk_count: int
    status: RecordingStatus


class TimetableSlot(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    weekday: int = Field(ge=0, le=6)
    start: time
    end: time
    subject: str
    room: Optional[str] = None
    lecturer: Optional[str] = None


class Timetable(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    slots: List[TimetableSlot]
    source_image_id: Optional[UUID] = None
    confirmed_by_user: bool


class Word(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    w: str
    start: float
    end: float
    conf: float


class TranscriptSegment(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    start: float
    end: float
    speaker: str
    text: str
    words: List[Word]


class Transcript(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    segments: List[TranscriptSegment]
    asr_model: str
    language: str


class SpeakerInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    talk_time_s: float
    share: float = Field(ge=0, le=1)
    is_lecturer: bool
    method: Literal['talk_time', 'voiceprint']
    confidence: float


class SpeakerStats(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    speakers: List[SpeakerInfo]
    total_speech_time_s: Optional[float] = None
    total_duration_s: Optional[float] = None
    silence_time_s: Optional[float] = None


class ChapterNotes(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    start: float
    end: float
    summary: str
    key_points: List[str]
    definitions: List[str]
    examples: List[str]
    formulas: List[str]


class Notes(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    chapters: List[ChapterNotes]
    overall_summary: str


class Event(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[str] = None
    type: Literal['quiz', 'seminar', 'assignment_deadline', 'exam', 'project', 'schedule_change', 'other']
    title: str
    date_iso: Optional[str] = None
    date_text: str
    resolved: bool
    confidence: float
    source_quote: str
    start_s: float
    needs_review: bool
    candidate_dates: Optional[List[str]] = None


class ImportantQuestion(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    text: str
    start_s: float
    end_s: Optional[float] = None
    reason: Literal['teacher_flagged', 'posed_to_class', 'repeated']
    answer_text: Optional[str] = None
    answer_start_s: Optional[float] = None
    answer_end_s: Optional[float] = None
    transcript_snippet: Optional[str] = None
    answer_snippet: Optional[str] = None
    lecturer_self_answered: bool = False
    student_asked: bool = False


class EmphasisPhrase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    phrase: str
    count: int
    spans: List[Tuple[float, float]]
    context_snippet: Optional[str] = None
    description: Optional[str] = None


class HabitPhrase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    phrase: str
    count: int
    context_snippet: Optional[str] = None
    first_occurrence_s: Optional[float] = None
    last_occurrence_s: Optional[float] = None
    mean_inter_arrival_s: Optional[float] = None
    description: Optional[str] = None


class Phrases(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    emphasis: List[EmphasisPhrase]
    habits: List[HabitPhrase]


class JobStatusEnum(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class JobStatus(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    recording_id: UUID
    status: JobStatusEnum
    stage: Optional[str] = None
    progress: float = Field(ge=0, le=1)
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class PairedDevice(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    device_id: str
    device_name: str
    token: str
    paired_at: datetime


class ServerInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    host: str
    port: int
    token: str
    server_id: str


def generate_json_schemas(output_dir: str = "schemas") -> None:
    """Writes all Pydantic models to JSON schema files."""
    os.makedirs(output_dir, exist_ok=True)
    models = [
        Recording, TimetableSlot, Timetable, Transcript, 
        SpeakerStats, Notes, Event, ImportantQuestion, 
        Phrases, JobStatus, PairedDevice, ServerInfo
    ]
    for model in models:
        schema = model.model_json_schema()
        with open(os.path.join(output_dir, f"{model.__name__}.json"), "w") as f:
            json.dump(schema, f, indent=2)
