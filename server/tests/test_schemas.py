import json
import os
import shutil
import tempfile
from datetime import datetime, time, timezone
from uuid import uuid4

import pytest

from lecturewhisper.api.schemas import (
    ChapterNotes,
    EmphasisPhrase,
    Event,
    HabitPhrase,
    ImportantQuestion,
    JobStatus,
    JobStatusEnum,
    Notes,
    PairedDevice,
    Phrases,
    Recording,
    RecordingStatus,
    ServerInfo,
    SpeakerInfo,
    SpeakerStats,
    Timetable,
    TimetableSlot,
    Transcript,
    TranscriptSegment,
    Word,
    generate_json_schemas,
)


def test_recording_instantiation():
    record = Recording(
        id=uuid4(),
        device_id="dev-123",
        started_at=datetime.now(timezone.utc),
        duration_s=120.5,
        timetable_slot_id=None,
        subject="Math",
        sha256="abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234",
        chunk_count=3,
        status=RecordingStatus.queued,
    )
    assert record.device_id == "dev-123"
    assert record.status == RecordingStatus.queued


def test_timetable_instantiation():
    slot = TimetableSlot(
        id=uuid4(),
        weekday=0,
        start=time(9, 0),
        end=time(10, 0),
        subject="CS101",
        room="Room A",
        lecturer="Dr. Smith"
    )
    timetable = Timetable(
        slots=[slot],
        source_image_id=None,
        confirmed_by_user=True
    )
    assert len(timetable.slots) == 1
    assert timetable.slots[0].weekday == 0


def test_transcript_instantiation():
    word = Word(w="Hello", start=0.0, end=0.5, conf=0.99)
    segment = TranscriptSegment(
        start=0.0, end=0.5, speaker="SPEAKER_00", text="Hello", words=[word]
    )
    transcript = Transcript(
        segments=[segment], asr_model="whisper-v3", language="en"
    )
    assert transcript.language == "en"
    assert transcript.segments[0].words[0].w == "Hello"


def test_speaker_stats_instantiation():
    info = SpeakerInfo(
        id="SPEAKER_00",
        talk_time_s=60.0,
        share=1.0,
        is_lecturer=True,
        method="talk_time",
        confidence=0.95
    )
    stats = SpeakerStats(speakers=[info])
    assert stats.speakers[0].is_lecturer is True


def test_notes_instantiation():
    chapter = ChapterNotes(
        title="Intro",
        start=0.0,
        end=60.0,
        summary="Introduction to topic",
        key_points=["Point 1"],
        definitions=["Def 1"],
        examples=["Ex 1"],
        formulas=["E=mc^2"]
    )
    notes = Notes(chapters=[chapter], overall_summary="Good lecture")
    assert notes.overall_summary == "Good lecture"


def test_event_instantiation():
    event = Event(
        type="quiz",
        title="Midterm",
        date_text="Next week",
        resolved=False,
        confidence=0.8,
        source_quote="We have a quiz next week",
        start_s=10.0,
        needs_review=True
    )
    assert event.type == "quiz"


def test_important_question_instantiation():
    q = ImportantQuestion(
        text="Will this be on the test?",
        start_s=20.5,
        reason="posed_to_class"
    )
    assert q.reason == "posed_to_class"


def test_phrases_instantiation():
    emph = EmphasisPhrase(phrase="remember this", count=2, spans=[(10.0, 11.0), (20.0, 21.0)])
    habit = HabitPhrase(phrase="um", count=50)
    phrases = Phrases(emphasis=[emph], habits=[habit])
    assert len(phrases.emphasis) == 1


def test_job_status_instantiation():
    job = JobStatus(
        id=uuid4(),
        recording_id=uuid4(),
        status=JobStatusEnum.pending,
        stage="upload",
        progress=0.0,
        error=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    assert job.status == JobStatusEnum.pending


def test_paired_device_instantiation():
    dev = PairedDevice(
        device_id="dev-1",
        device_name="My Watch",
        token="secret",
        paired_at=datetime.now(timezone.utc)
    )
    assert dev.token == "secret"


def test_server_info_instantiation():
    info = ServerInfo(host="192.168.1.5", port=8000, token="abc", server_id="srv-1")
    assert info.port == 8000


def test_json_schema_generation():
    with tempfile.TemporaryDirectory() as tmpdir:
        generate_json_schemas(output_dir=tmpdir)
        files = os.listdir(tmpdir)
        assert len(files) > 0
        assert "Recording.json" in files
        assert "Transcript.json" in files
        
        with open(os.path.join(tmpdir, "Recording.json"), "r") as f:
            schema = json.load(f)
            assert schema["title"] == "Recording"
            assert "device_id" in schema["properties"]


def test_serialization_roundtrip():
    # Test round trip with a complex model
    original = Transcript(
        segments=[
            TranscriptSegment(
                start=0.0, end=1.0, speaker="SPK", text="Test", 
                words=[Word(w="Test", start=0.0, end=1.0, conf=1.0)]
            )
        ],
        asr_model="test-model",
        language="en"
    )
    
    json_str = original.model_dump_json()
    reloaded = Transcript.model_validate_json(json_str)
    
    assert original.asr_model == reloaded.asr_model
    assert original.segments[0].text == reloaded.segments[0].text
    assert original.segments[0].words[0].w == reloaded.segments[0].words[0].w
