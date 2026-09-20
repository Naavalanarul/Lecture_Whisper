"""
Acoustic Classroom and Far-Field Audio Simulation for Lecture Whisper.

Simulates physical acoustic classroom degradation:
- Room Impulse Response (RIR) reverberation with calibrated RT60
- Ambient HVAC and classroom crowd noise at calibrated SNR (dB)
- 64 kbps mono AAC re-encoding
Supports 3 standard severity presets: 'mild', 'moderate', 'high'.
"""
from __future__ import annotations

import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np
from scipy.io import wavfile
from scipy.signal import fftconvolve


@dataclass
class SimulationConfig:
    severity: str
    rt60_sec: float
    snr_db: float
    description: str


SIMULATION_PRESETS: Dict[str, SimulationConfig] = {
    "mild": SimulationConfig(
        severity="mild",
        rt60_sec=0.30,
        snr_db=25.0,
        description="Small carpeted seminar room; low HVAC background.",
    ),
    "moderate": SimulationConfig(
        severity="moderate",
        rt60_sec=0.70,
        snr_db=18.0,
        description="Medium tiered university lecture hall; typical HVAC & hard surfaces.",
    ),
    "high": SimulationConfig(
        severity="high",
        rt60_sec=1.20,
        snr_db=10.0,
        description="Large reverberant auditorium / back-row far-field capture with crowd babble.",
    ),
}


def generate_room_impulse_response(rt60_sec: float, sample_rate: int = 16000) -> np.ndarray:
    """
    Synthesize an acoustic Room Impulse Response (RIR).
    Uses exponential decay envelope matching target RT60 (time for 60 dB decay).
    """
    length_sec = max(0.25, rt60_sec * 1.1)
    n_samples = int(length_sec * sample_rate)
    t = np.linspace(0, length_sec, n_samples, endpoint=False)

    # Decay rate: 60 dB decay corresponds to factor of 10^-3 (-60 dB = 20*log10(10^-3))
    # exp(-t / tau) = 10^-3 => -t / tau = -3 * ln(10) => tau = rt60 / (3 * ln(10))
    tau = rt60_sec / (3.0 * np.log(10))
    envelope = np.exp(-t / tau)

    # Random diffuse reflection pattern
    rng = np.random.default_rng(seed=42)
    diffuse = rng.standard_normal(n_samples) * envelope

    # Direct path arrival at t=0
    direct_path = np.zeros(n_samples)
    direct_path[0] = 1.0

    # Combine direct path and diffuse reverberation
    rir = direct_path + 0.35 * diffuse
    # Normalize peak
    rir = rir / np.max(np.abs(rir))
    return rir


def generate_classroom_noise(n_samples: int, sample_rate: int = 16000) -> np.ndarray:
    """Generate ambient classroom noise (pink-shifted spectrum for HVAC + low rumble)."""
    rng = np.random.default_rng(seed=1337)
    white = rng.standard_normal(n_samples)

    # Approximate pink noise via cumulative sum low-pass filtering
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1.0, -2.494956002, 2.017265875, -0.522189400]
    from scipy.signal import lfilter
    pink = lfilter(b, a, white)

    # Add gentle low-frequency hum (60 Hz mains / projector hum)
    t = np.linspace(0, n_samples / sample_rate, n_samples, endpoint=False)
    hum = 0.08 * np.sin(2 * np.pi * 60.0 * t)

    noise = pink + hum
    # Normalize noise std to 1.0
    return noise / (np.std(noise) + 1e-8)


def apply_acoustic_degradation(
    audio: np.ndarray,
    rt60_sec: float,
    snr_db: float,
    sample_rate: int = 16000,
) -> np.ndarray:
    """Apply RIR convolution and add colored noise at target SNR."""
    # Ensure float64
    x = audio.astype(np.float64)
    if np.max(np.abs(x)) > 1.0:
        x = x / 32768.0

    # 1. Convolve with RIR
    rir = generate_room_impulse_response(rt60_sec, sample_rate=sample_rate)
    reverberant = fftconvolve(x, rir, mode="full")[: len(x)]

    # 2. Add noise at calibrated SNR
    sig_power = np.mean(reverberant ** 2)
    if sig_power > 0:
        target_noise_power = sig_power * (10.0 ** (-snr_db / 10.0))
        noise = generate_classroom_noise(len(reverberant), sample_rate=sample_rate)
        noise_scaled = noise * np.sqrt(target_noise_power)
        degraded = reverberant + noise_scaled
    else:
        degraded = reverberant

    # Peak normalize with headroom
    peak = np.max(np.abs(degraded))
    if peak > 0:
        degraded = (degraded / peak) * 0.90

    # Convert to 16-bit PCM integer scale
    return (degraded * 32767.0).astype(np.int16)


def simulate_farfield_recording(
    input_wav_path: Path | str,
    output_dir: Path | str,
    severity: str = "moderate",
    output_stem: Optional[str] = None,
) -> Tuple[Path, Path]:
    """
    Run full simulation pipeline on a clean WAV file:
    1. Apply RIR convolution and ambient classroom noise at preset severity.
    2. Write degraded 16-bit PCM WAV.
    3. Re-encode via ffmpeg to 64 kbps mono AAC M4A.
    Returns (degraded_wav_path, degraded_m4a_path).
    """
    inp = Path(input_wav_path)
    if not inp.exists():
        raise FileNotFoundError(f"Input WAV not found: {inp}")

    preset = SIMULATION_PRESETS.get(severity.lower())
    if not preset:
        raise ValueError(f"Unknown severity '{severity}'. Choose from: {list(SIMULATION_PRESETS.keys())}")

    out_dir = Path(output_dir) / severity
    out_dir.mkdir(parents=True, exist_ok=True)

    stem = output_stem or inp.stem
    out_wav = out_dir / f"{stem}_{severity}.wav"
    out_m4a = out_dir / f"{stem}_{severity}.m4a"

    sr, audio = wavfile.read(str(inp))
    if audio.ndim > 1:
        # Downmix stereo to mono
        audio = np.mean(audio, axis=1)

    degraded_audio = apply_acoustic_degradation(
        audio,
        rt60_sec=preset.rt60_sec,
        snr_db=preset.snr_db,
        sample_rate=sr,
    )

    wavfile.write(str(out_wav), sr, degraded_audio)

    # Encode to 64 kbps mono AAC via ffmpeg
    subprocess.run([
        "ffmpeg", "-y", "-i", str(out_wav),
        "-ar", "16000", "-ac", "1", "-c:a", "aac", "-b:a", "64k",
        str(out_m4a)
    ], check=True, capture_output=True)

    return out_wav, out_m4a
