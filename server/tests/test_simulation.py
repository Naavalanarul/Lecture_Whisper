"""
Unit tests for acoustic classroom simulation module.
Tests RIR generation, colored noise synthesis, degradation filter, and AAC re-encoding.
"""
from pathlib import Path
import numpy as np
import pytest
from scipy.io import wavfile

from lecturewhisper.eval.simulation import (
    SIMULATION_PRESETS,
    apply_acoustic_degradation,
    generate_classroom_noise,
    generate_room_impulse_response,
    simulate_farfield_recording,
)


def test_rir_generation():
    rir = generate_room_impulse_response(rt60_sec=0.5, sample_rate=16000)
    assert len(rir) > 0
    assert rir[0] == 1.0  # Direct arrival
    # Check that tail energy is significantly lower than initial peak
    head_power = np.mean(rir[:100] ** 2)
    tail_power = np.mean(rir[-100:] ** 2)
    assert tail_power < head_power


def test_classroom_noise_generation():
    noise = generate_classroom_noise(16000, sample_rate=16000)
    assert len(noise) == 16000
    assert np.isfinite(noise).all()
    assert 0.8 < np.std(noise) < 1.2


def test_apply_acoustic_degradation():
    sr = 16000
    t = np.linspace(0, 1.0, sr, endpoint=False)
    # 440 Hz pure tone
    pure_tone = (0.5 * np.sin(2 * np.pi * 440.0 * t) * 32767).astype(np.int16)

    degraded = apply_acoustic_degradation(pure_tone, rt60_sec=0.4, snr_db=20.0, sample_rate=sr)
    assert len(degraded) == len(pure_tone)
    assert degraded.dtype == np.int16
    assert np.max(np.abs(degraded)) > 0


def test_simulate_farfield_recording(tmp_path):
    sr = 16000
    audio_data = (np.random.randn(sr * 2) * 10000).astype(np.int16)
    test_wav = tmp_path / "clean_test.wav"
    wavfile.write(str(test_wav), sr, audio_data)

    for severity in ("mild", "moderate", "high"):
        out_wav, out_m4a = simulate_farfield_recording(
            test_wav,
            output_dir=tmp_path / "sim",
            severity=severity,
        )
        assert out_wav.exists()
        assert out_m4a.exists()
        assert out_wav.stat().st_size > 0
        assert out_m4a.stat().st_size > 0
