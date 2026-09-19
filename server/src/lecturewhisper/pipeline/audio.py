"""Audio normalization and utilities using ffmpeg."""

from __future__ import annotations

import json
import logging
import shutil
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)


class AudioError(Exception):
    """Raised when audio conversion or probing fails."""


def check_ffmpeg() -> str:
    """Verify ffmpeg binary exists."""
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise AudioError("ffmpeg binary not found. Please install via `brew install ffmpeg`.")
    return ffmpeg


def check_ffprobe() -> str:
    """Verify ffprobe binary exists."""
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        raise AudioError("ffprobe binary not found. Please install via `brew install ffmpeg`.")
    return ffprobe


def get_audio_duration(file_path: Path | str) -> float:
    """Get the duration of an audio file in seconds."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {path}")

    ffprobe = check_ffprobe()
    cmd = [
        ffprobe,
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "json",
        str(path),
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise AudioError(f"ffprobe failed: {res.stderr.strip()}")

    try:
        data = json.loads(res.stdout)
        return float(data["format"]["duration"])
    except (KeyError, ValueError, json.JSONDecodeError) as e:
        raise AudioError(f"Could not parse duration from ffprobe output: {e}") from e


def normalize_to_wav(
    input_path: Path | str,
    output_path: Path | str | None = None,
    target_sample_rate: int = 16000,
) -> Path:
    """
    Convert any input audio format into 16 kHz mono 16-bit PCM WAV.
    
    If output_path is not specified, writes to same stem with .wav extension.
    """
    src = Path(input_path)
    if not src.exists():
        raise FileNotFoundError(f"Audio file not found: {src}")

    ffmpeg = check_ffmpeg()

    if output_path is None:
        dst = src.with_suffix(".norm.wav")
    else:
        dst = Path(output_path)

    dst.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        ffmpeg,
        "-y",  # overwrite
        "-i",
        str(src),
        "-vn",  # no video
        "-acodec",
        "pcm_s16le",
        "-ar",
        str(target_sample_rate),
        "-ac",
        "1",  # mono
        str(dst),
    ]

    logger.info("Normalizing audio %s -> %s (16kHz mono WAV)", src, dst)
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise AudioError(f"ffmpeg normalization failed: {res.stderr.strip()}")

    if not dst.exists() or dst.stat().st_size == 0:
        raise AudioError("Normalized WAV file was not created or is empty.")

    return dst
