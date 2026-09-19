"""Voice Activity Detection (VAD) module using Silero VAD with fallback."""

from __future__ import annotations

import gc
import logging
import wave
from pathlib import Path
from typing import Protocol

logger = logging.getLogger(__name__)


class VADSegment:
    """A segment of detected speech."""

    def __init__(self, start: float, end: float) -> None:
        self.start = round(start, 3)
        self.end = round(end, 3)

    @property
    def duration(self) -> float:
        return self.end - self.start

    def to_dict(self) -> dict[str, float]:
        return {"start": self.start, "end": self.end}

    def __repr__(self) -> str:
        return f"VADSegment({self.start:.2f}s -> {self.end:.2f}s)"


class VADEngine(Protocol):
    """Protocol for VAD implementations."""

    def detect_speech(self, audio_path: Path | str, threshold: float = 0.5) -> list[VADSegment]:
        ...

    def unload(self) -> None:
        ...


class SileroVAD:
    """Silero VAD implementation running on CPU with 16kHz audio."""

    def __init__(self) -> None:
        self._model = None
        self._utils = None

    def _load(self) -> None:
        if self._model is not None:
            return
        try:
            import silero_vad
            self._model = silero_vad.load_silero_vad(onnx=False)
            self._read_audio = silero_vad.read_audio
            self._get_speech_timestamps = silero_vad.get_speech_timestamps
            logger.info("Silero VAD loaded successfully on CPU")
        except ImportError as e:
            logger.warning("silero_vad package not available, fallback will be used: %s", e)
            self._model = None

    def detect_speech(self, audio_path: Path | str, threshold: float = 0.5) -> list[VADSegment]:
        self._load()
        if self._model is None:
            # Fallback to energy VAD
            return EnergyVAD().detect_speech(audio_path, threshold=threshold)

        path = str(audio_path)
        wav = self._read_audio(path, sampling_rate=16000)
        timestamps = self._get_speech_timestamps(
            wav,
            self._model,
            sampling_rate=16000,
            threshold=threshold,
            return_seconds=True,
        )

        segments = [
            VADSegment(start=item["start"], end=item["end"])
            for item in timestamps
        ]
        logger.info("Silero VAD detected %d speech segments in %s", len(segments), path)
        return segments

    def unload(self) -> None:
        if self._model is not None:
            del self._model
            self._model = None
            gc.collect()
            logger.info("Silero VAD unloaded from memory")


class EnergyVAD:
    """Lightweight pure-python energy/amplitude VAD for testing and fallback."""

    def detect_speech(self, audio_path: Path | str, threshold: float = 0.02) -> list[VADSegment]:
        """Simple RMS energy windowing on 16-bit PCM WAV."""
        path = Path(audio_path)
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {path}")

        try:
            with wave.open(str(path), "rb") as wf:
                sample_rate = wf.getframerate()
                n_channels = wf.getnchannels()
                sampwidth = wf.getsampwidth()
                n_frames = wf.getnframes()
                raw_data = wf.readframes(n_frames)

            # Process 512 samples per frame (32ms at 16kHz)
            chunk_size = 512
            total_samples = len(raw_data) // (sampwidth * n_channels)
            step_s = chunk_size / sample_rate

            import struct
            fmt = f"<{n_frames * n_channels}h"
            samples = struct.unpack(fmt, raw_data)
            if n_channels > 1:
                samples = samples[::n_channels]  # mono

            segments: list[VADSegment] = []
            in_speech = False
            seg_start = 0.0

            max_val = 32768.0
            for i in range(0, len(samples), chunk_size):
                chunk = samples[i : i + chunk_size]
                if not chunk:
                    break
                rms = (sum(s * s for s in chunk) / len(chunk)) ** 0.5 / max_val
                t = i / sample_rate

                if rms >= threshold:
                    if not in_speech:
                        in_speech = True
                        seg_start = t
                else:
                    if in_speech:
                        in_speech = False
                        if t - seg_start >= 0.2:  # Min speech duration 200ms
                            segments.append(VADSegment(start=seg_start, end=t))

            if in_speech:
                duration = total_samples / sample_rate
                if duration - seg_start >= 0.2:
                    segments.append(VADSegment(start=seg_start, end=duration))

            # If no speech detected but file has audio, treat entire file as speech
            if not segments and total_samples > 0:
                segments.append(VADSegment(start=0.0, end=total_samples / sample_rate))

            return segments
        except Exception as e:
            logger.warning("Energy VAD failed: %s; returning full duration", e)
            return [VADSegment(start=0.0, end=1.0)]

    def unload(self) -> None:
        pass


def detect_speech_segments(audio_path: Path | str, threshold: float = 0.5) -> list[VADSegment]:
    """Convenience function using Silero VAD (with EnergyVAD fallback)."""
    vad = SileroVAD()
    try:
        return vad.detect_speech(audio_path, threshold=threshold)
    finally:
        vad.unload()
