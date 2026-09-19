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

    def save_chunk(self, recording_id: UUID | str, chunk_index: int, audio_data: bytes) -> Path:
        """Save an individual recording chunk to chunks/ directory."""
        chunks_dir = self._get_recording_dir(recording_id) / "chunks"
        chunks_dir.mkdir(parents=True, exist_ok=True)
        chunk_path = chunks_dir / f"chunk_{chunk_index:04d}.wav"
        chunk_path.write_bytes(audio_data)
        return chunk_path

    def stitch_chunks(self, recording_id: UUID | str) -> Path:
        """Concatenate all sequential chunks into a single continuous master audio track."""
        chunks_dir = self._get_recording_dir(recording_id) / "chunks"
        master_path = self.get_recording_path(recording_id)
        if not chunks_dir.exists():
            return master_path

        chunk_files = sorted(chunks_dir.glob("chunk_*.wav"))
        if not chunk_files:
            return master_path

        if len(chunk_files) == 1:
            master_path.write_bytes(chunk_files[0].read_bytes())
            return master_path

        # Concatenate audio chunks
        try:
            import numpy as np
            import soundfile as sf

            all_audio = []
            sr = 16000
            for cf in chunk_files:
                data, sr = sf.read(str(cf))
                all_audio.append(data)
            concatenated = np.concatenate(all_audio, axis=0)
            sf.write(str(master_path), concatenated, sr)
        except Exception:
            with master_path.open("wb") as out_f:
                for cf in chunk_files:
                    out_f.write(cf.read_bytes())

        return master_path
