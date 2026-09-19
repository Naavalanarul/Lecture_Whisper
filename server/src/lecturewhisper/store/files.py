from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from uuid import UUID

DEFAULT_STORAGE_DIR = Path.home() / ".lecturewhisper" / "storage"

class FileStore:
    def __init__(self, storage_dir: Path | str = DEFAULT_STORAGE_DIR):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
    def _get_recording_dir(self, recording_id: UUID | str) -> Path:
        recording_dir = self.storage_dir / str(recording_id)
        recording_dir.mkdir(parents=True, exist_ok=True)
        return recording_dir

    def save_recording(self, recording_id: UUID | str, audio_data: bytes) -> Path:
        path = self._get_recording_dir(recording_id) / "audio.wav"
        path.write_bytes(audio_data)
        return path

    def get_recording_path(self, recording_id: UUID | str) -> Path:
        return self._get_recording_dir(recording_id) / "audio.wav"

    def save_json(self, recording_id: UUID | str, name: str, data: dict[str, Any] | list[Any]) -> Path:
        if not name.endswith(".json"):
            name = f"{name}.json"
        path = self._get_recording_dir(recording_id) / name
        path.write_text(json.dumps(data, indent=2))
        return path

    def load_json(self, recording_id: UUID | str, name: str) -> dict[str, Any] | list[Any]:
        if not name.endswith(".json"):
            name = f"{name}.json"
        path = self._get_recording_dir(recording_id) / name
        return json.loads(path.read_text())
