#!/usr/bin/env python3
"""
Far-Field and Acoustic Degradation Benchmark Runner for Lecture Whisper.

Features:
- Part A: Algorithmic Simulation (RIR reverberation at 3 severities + SNR colored noise + AAC)
- Part B: Physical Phone Hardware Path via ADB and MacBook speaker playback (afplay)
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path

# Add server source to sys.path
REPO_ROOT = Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(REPO_ROOT / "server" / "src"))

from lecturewhisper.eval.asr import calculate_wer_metrics, detect_hallucinations
from lecturewhisper.eval.parsers import parse_transcript
from lecturewhisper.eval.simulation import SIMULATION_PRESETS, simulate_farfield_recording
from lecturewhisper.pipeline.asr import MLXWhisperASR


def check_adb_devices() -> list[str]:
    """Return list of connected ADB device serial numbers."""
    try:
        res = subprocess.run(["adb", "devices"], capture_output=True, text=True, check=True)
        lines = res.stdout.strip().splitlines()
        devices = []
        for line in lines[1:]:
            parts = line.split()
            if len(parts) >= 2 and parts[1] == "device":
                devices.append(parts[0])
        return devices
    except Exception:
        return []


def run_software_simulation(
    audio_wav: Path,
    reference_transcript_path: Path,
    output_dir: Path,
    asr: MLXWhisperASR,
) -> dict:
    """Run simulation across mild, moderate, and high severities and score with ASR."""
    print("\n=======================================================")
    print("🔬 Part A: Software Acoustic Classroom Simulation")
    print("=======================================================")

    ref_transcript = parse_transcript(reference_transcript_path)
    ref_text = ref_transcript.full_text

    results = {}

    for severity, cfg in SIMULATION_PRESETS.items():
        print(f"\n--> Simulating [{severity.upper()}] Severity:")
        print(f"    - RT60 Reverb: {cfg.rt60_sec}s")
        print(f"    - Ambient Noise SNR: {cfg.snr_db} dB")
        print(f"    - Scenario: {cfg.description}")

        sim_wav, sim_m4a = simulate_farfield_recording(
            audio_wav,
            output_dir=output_dir / "simulated",
            severity=severity,
        )
        print(f"    - Generated degraded audio: {sim_m4a}")

        # Run ASR
        t0 = time.time()
        hyp = asr.transcribe(sim_m4a)
        proc_time = time.time() - t0
        hyp_text = " ".join(s.text for s in hyp.segments)
        audio_dur = max([s.end for s in hyp.segments], default=1.0)
        rtf = proc_time / audio_dur

        metrics = calculate_wer_metrics(ref_text, hyp_text)
        hallucinations = detect_hallucinations(hyp_text)

        print(f"    - ASR Processing Time: {proc_time:.2f}s (RTF: {rtf:.3f})")
        print(f"    - Strict WER:             {metrics.strict_wer * 100:.2f}%")
        print(f"    - Filler-Insensitive WER: {metrics.filler_insensitive_wer * 100:.2f}%")
        if hallucinations:
            print(f"    - ⚠️ Potential Anomalies: {len(hallucinations)} flagged")

        results[severity] = {
            "rt60_sec": cfg.rt60_sec,
            "snr_db": cfg.snr_db,
            "strict_wer": metrics.strict_wer,
            "filler_wer": metrics.filler_insensitive_wer,
            "rtf": round(rtf, 3),
            "hallucinations": hallucinations,
        }

    return results


def run_hardware_pixel_test(
    audio_file: Path,
    duration_sec: float = 60.0,
) -> None:
    """Automated Google Pixel 8a physical far-field test via ADB."""
    print("\n=======================================================")
    print("📱 Part B: Google Pixel 8a Hardware Far-Field Benchmark")
    print("=======================================================")

    devices = check_adb_devices()
    if not devices:
        print("\n[!] No Android device connected via ADB.")
        print("\nTo perform physical device far-field testing on Google Pixel 8a:")
        print("  1. Connect your Google Pixel 8a to this MacBook with a USB-C cable.")
        print("  2. In Developer Settings on the phone, toggle ON 'USB Debugging'.")
        print("  3. Run `adb reverse tcp:8420 tcp:8420` to enable reverse tethering.")
        print("  4. Place phone 3 to 5 meters away on a desk facing the MacBook speakers.")
        print("  5. Set MacBook output volume to ~70-75% SPL.")
        print("  6. Re-run: python3 scripts/farfield_run.py --phone-only\n")
        return

    device_id = devices[0]
    print(f"[✓] Detected Android device: {device_id}")

    # Set up reverse port forwarding
    print("[*] Setting up ADB reverse port forwarding (tcp:8420 -> tcp:8420)...")
    subprocess.run(["adb", "-s", device_id, "reverse", "tcp:8420", "tcp:8420"], check=True)

    # Launch app and trigger recording via intent
    print("[*] Dispatching ADB start recording intent...")
    subprocess.run([
        "adb", "-s", device_id, "shell", "am", "start",
        "-n", "com.lecturewhisper/.MainActivity",
        "--es", "action", "start",
        "--es", "subject", "Acoustic_Farfield_Calibration"
    ], check=True)

    time.sleep(1.5)  # Audio pipeline warm-up

    # Play audio on MacBook speakers
    print(f"[*] Playing reference audio through MacBook speakers for {duration_sec:.1f}s...")
    afplay_proc = subprocess.Popen(["afplay", str(audio_file), "-t", str(duration_sec)])
    afplay_proc.wait()

    # Stop recording via intent
    print("[*] Playback completed. Dispatching ADB stop recording intent...")
    subprocess.run([
        "adb", "-s", device_id, "shell", "am", "start",
        "-n", "com.lecturewhisper/.MainActivity",
        "--es", "action", "stop"
    ], check=True)

    print("[✓] Hardware recording cycle completed! Audio saved on device and auto-syncing to laptop.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Far-field acoustic simulation and hardware runner.")
    parser.add_argument("--audio", type=str, default="data/normalized/wav/mit_6006_lec1.wav", help="Input audio WAV")
    parser.add_argument("--transcript", type=str, default="data/transcripts/mit_6006_lec1.json", help="Reference transcript JSON")
    parser.add_argument("--sim-only", action="store_true", help="Run only software simulation")
    parser.add_argument("--phone-only", action="store_true", help="Run only phone hardware path")
    parser.add_argument("--output-dir", type=str, default="data", help="Output directory for simulated media")
    args = parser.parse_args()

    audio_path = REPO_ROOT / args.audio
    transcript_path = REPO_ROOT / args.transcript
    out_dir = REPO_ROOT / args.output_dir

    if not args.phone_only:
        asr = MLXWhisperASR()
        run_software_simulation(audio_path, transcript_path, out_dir, asr)

    if not args.sim_only:
        run_hardware_pixel_test(audio_path, duration_sec=60.0)


if __name__ == "__main__":
    main()
