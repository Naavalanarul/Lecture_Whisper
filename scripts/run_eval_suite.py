#!/usr/bin/env python3
"""
Master Evaluation Suite Runner for Lecture Whisper.

Performs:
1. Calibration Window Extraction (5-minute windows) for MIT 6.006 & MIT 6.0001.
2. ASR Transcription with MLX Whisper Large-v3-Turbo.
3. Strict and Filler-Insensitive WER Scoring against official reference transcripts.
4. Evaluation across 10 Technical Indian English (TIE) accented speakers.
5. Generates review/asr-calibration.csv and interactive review/calibration.html.
6. Benchmarks Real-Time Factor (RTF) and hallucination indicators.
"""
from __future__ import annotations

import json
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(REPO_ROOT / "server" / "src"))

from lecturewhisper.eval.asr import (
    AlignedCalibrationSegment,
    calculate_wer_metrics,
    detect_hallucinations,
    extract_calibration_window,
    generate_calibration_html,
    write_calibration_csv,
)
from lecturewhisper.eval.parsers import TranscriptSegment, UnifiedTranscript, parse_transcript
from lecturewhisper.pipeline.asr import MLXWhisperASR


def slice_audio(input_file: Path, output_file: Path, start_sec: float, duration_sec: float) -> Path:
    """Extract an audio slice via ffmpeg."""
    output_file.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        "ffmpeg", "-y", "-ss", str(start_sec), "-t", str(duration_sec),
        "-i", str(input_file),
        "-c", "copy", str(output_file)
    ], check=True, capture_output=True)
    return output_file


def run_asr_evaluation() -> dict:
    asr = MLXWhisperASR()
    review_dir = REPO_ROOT / "review"
    review_dir.mkdir(parents=True, exist_ok=True)

    suite_results = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "model": asr.model_name,
        "lectures": {},
        "tie_accented": {},
    }

    all_calibration_segments: list[AlignedCalibrationSegment] = []

    # -------------------------------------------------------------------------
    # 1. MIT 6.006 (Algorithms) 5-Minute Window Calibration (300s - 600s)
    # -------------------------------------------------------------------------
    print("\n=======================================================")
    print("▶ Evaluating MIT 6.006 Lecture 1 (Algorithms, Jason Ku)")
    print("=======================================================")

    audio_6006 = REPO_ROOT / "data" / "normalized" / "m4a" / "mit_6006_lec1.m4a"
    ref_6006_path = REPO_ROOT / "data" / "transcripts" / "mit_6006_lec1.json"
    ref_6006 = parse_transcript(ref_6006_path)

    # Slice 5-minute calibration window (300s to 600s: 5:00 - 10:00)
    slice_6006 = REPO_ROOT / "data" / "normalized" / "m4a" / "mit_6006_cal_window.m4a"
    slice_audio(audio_6006, slice_6006, start_sec=300.0, duration_sec=300.0)

    print(f"[*] Transcribing 5-minute calibration window [05:00 - 10:00] ({slice_6006})...")
    t0 = time.time()
    hyp_6006_resp = asr.transcribe(slice_6006)
    proc_time_6006 = time.time() - t0
    rtf_6006 = proc_time_6006 / 300.0

    # Adjust hyp timestamps relative to original lecture time (+300s)
    adjusted_hyp_segments = [
        TranscriptSegment(
            start_sec=s.start + 300.0,
            end_sec=s.end + 300.0,
            text=s.text,
            speaker=None,
        )
        for s in hyp_6006_resp.segments
    ]
    hyp_6006_transcript = UnifiedTranscript(
        recording_id="mit_6006_lec1",
        source_format="whisper_mlx",
        segments=adjusted_hyp_segments,
    )

    cal_6006_segments = extract_calibration_window(
        ref_6006,
        hyp_6006_transcript,
        window_start_sec=300.0,
        window_duration_sec=300.0,
    )
    all_calibration_segments.extend(cal_6006_segments)

    ref_text_6006 = " ".join(s.text for s in ref_6006.segments if 300.0 <= s.start_sec < 600.0)
    hyp_text_6006 = " ".join(s.text for s in hyp_6006_resp.segments)
    metrics_6006 = calculate_wer_metrics(ref_text_6006, hyp_text_6006)
    hallucinations_6006 = detect_hallucinations(hyp_text_6006)

    print(f"  • Processing Time:         {proc_time_6006:.2f}s (RTF: {rtf_6006:.3f})")
    print(f"  • Strict WER:                {metrics_6006.strict_wer * 100:.2f}%")
    print(f"  • Filler-Insensitive WER:    {metrics_6006.filler_insensitive_wer * 100:.2f}%")
    print(f"  • Hits: {metrics_6006.hits} | Subs: {metrics_6006.substitutions} | Dels: {metrics_6006.deletions} | Ins: {metrics_6006.insertions}")
    print(f"  • Hallucinations / Anomalies: {len(hallucinations_6006)}")

    suite_results["lectures"]["mit_6006_lec1"] = {
        "category": "Clean Studio / Large Lecture Hall",
        "instructor": "Jason Ku",
        "window": "300s - 600s (5m)",
        "rtf": round(rtf_6006, 3),
        "proc_time_sec": round(proc_time_6006, 2),
        "metrics": metrics_6006.to_dict(),
        "hallucinations": hallucinations_6006,
    }

    # -------------------------------------------------------------------------
    # 2. MIT 6.0001 (Python) 5-Minute Window Calibration (300s - 600s)
    # -------------------------------------------------------------------------
    print("\n=======================================================")
    print("▶ Evaluating MIT 6.0001 Lecture 1 (Intro Python, Dr. Ana Bell)")
    print("=======================================================")

    audio_60001 = REPO_ROOT / "data" / "normalized" / "m4a" / "mit_60001_lec1.m4a"
    ref_60001_path = REPO_ROOT / "data" / "transcripts" / "mit_60001_lec1.json"
    ref_60001 = parse_transcript(ref_60001_path)

    slice_60001 = REPO_ROOT / "data" / "normalized" / "m4a" / "mit_60001_cal_window.m4a"
    slice_audio(audio_60001, slice_60001, start_sec=300.0, duration_sec=300.0)

    print(f"[*] Transcribing 5-minute calibration window [05:00 - 10:00] ({slice_60001})...")
    t0 = time.time()
    hyp_60001_resp = asr.transcribe(slice_60001)
    proc_time_60001 = time.time() - t0
    rtf_60001 = proc_time_60001 / 300.0

    adjusted_hyp_segments_60001 = [
        TranscriptSegment(
            start_sec=s.start + 300.0,
            end_sec=s.end + 300.0,
            text=s.text,
            speaker=None,
        )
        for s in hyp_60001_resp.segments
    ]
    hyp_60001_transcript = UnifiedTranscript(
        recording_id="mit_60001_lec1",
        source_format="whisper_mlx",
        segments=adjusted_hyp_segments_60001,
    )

    cal_60001_segments = extract_calibration_window(
        ref_60001,
        hyp_60001_transcript,
        window_start_sec=300.0,
        window_duration_sec=300.0,
    )
    all_calibration_segments.extend(cal_60001_segments)

    ref_text_60001 = " ".join(s.text for s in ref_60001.segments if 300.0 <= s.start_sec < 600.0)
    hyp_text_60001 = " ".join(s.text for s in hyp_60001_resp.segments)
    metrics_60001 = calculate_wer_metrics(ref_text_60001, hyp_text_60001)
    hallucinations_60001 = detect_hallucinations(hyp_text_60001)

    print(f"  • Processing Time:         {proc_time_60001:.2f}s (RTF: {rtf_60001:.3f})")
    print(f"  • Strict WER:                {metrics_60001.strict_wer * 100:.2f}%")
    print(f"  • Filler-Insensitive WER:    {metrics_60001.filler_insensitive_wer * 100:.2f}%")
    print(f"  • Hits: {metrics_60001.hits} | Subs: {metrics_60001.substitutions} | Dels: {metrics_60001.deletions} | Ins: {metrics_60001.insertions}")
    print(f"  • Hallucinations / Anomalies: {len(hallucinations_60001)}")

    suite_results["lectures"]["mit_60001_lec1"] = {
        "category": "Classroom Discussion / Female Speaker",
        "instructor": "Dr. Ana Bell",
        "window": "300s - 600s (5m)",
        "rtf": round(rtf_60001, 3),
        "proc_time_sec": round(proc_time_60001, 2),
        "metrics": metrics_60001.to_dict(),
        "hallucinations": hallucinations_60001,
    }

    # -------------------------------------------------------------------------
    # 3. Technical Indian English (TIE) Accented Benchmark (10 Speakers)
    # -------------------------------------------------------------------------
    print("\n=======================================================")
    print("▶ Evaluating Technical Indian English (TIE) Benchmark")
    print("=======================================================")

    tie_meta_path = REPO_ROOT / "data" / "transcripts" / "tie_eval.json"
    tie_clips = json.loads(tie_meta_path.read_text())

    total_ref_words = 0
    total_hits = 0
    total_subs = 0
    total_dels = 0
    total_ins = 0
    total_audio_sec = 0.0
    total_proc_sec = 0.0

    tie_details = []

    for clip in tie_clips:
        cid = clip["raw_id"]
        wav_p = REPO_ROOT / clip["wav"]
        t0 = time.time()
        resp = asr.transcribe(wav_p)
        dur = time.time() - t0
        audio_dur = float(clip["duration_sec"])

        total_audio_sec += audio_dur
        total_proc_sec += dur

        hyp_text = " ".join(s.text for s in resp.segments)
        metrics = calculate_wer_metrics(clip["raw_transcript"], hyp_text)
        total_ref_words += metrics.ref_word_count
        total_hits += metrics.hits
        total_subs += metrics.substitutions
        total_dels += metrics.deletions
        total_ins += metrics.insertions

        tie_details.append({
            "id": cid,
            "region": clip["region"],
            "gender": clip["gender"],
            "discipline": clip["discipline"],
            "duration_sec": audio_dur,
            "strict_wer": metrics.strict_wer,
            "filler_wer": metrics.filler_insensitive_wer,
        })
        print(f"  • [{clip['region']} {clip['gender']}] {cid[:8]} ({audio_dur:.1f}s): Strict WER {metrics.strict_wer*100:.1f}%, Filler WER {metrics.filler_insensitive_wer*100:.1f}%")

    tie_strict_wer = (total_subs + total_dels + total_ins) / max(1, total_ref_words)
    tie_rtf = total_proc_sec / max(0.1, total_audio_sec)

    print(f"\n--> TIE Benchmark Aggregate:")
    print(f"  • Total Audio Duration: {total_audio_sec:.1f}s across {len(tie_clips)} speakers")
    print(f"  • Aggregate RTF:       {tie_rtf:.3f}")
    print(f"  • Aggregate Strict WER:  {tie_strict_wer * 100:.2f}%")

    suite_results["tie_accented"] = {
        "num_clips": len(tie_clips),
        "total_audio_sec": round(total_audio_sec, 2),
        "aggregate_strict_wer": round(tie_strict_wer, 4),
        "aggregate_rtf": round(tie_rtf, 3),
        "clips": tie_details,
    }

    # -------------------------------------------------------------------------
    # 4. Generate Calibration CSV & HTML
    # -------------------------------------------------------------------------
    print("\n=======================================================")
    print("📝 Generating Human Calibration Sheets and HTML Reviewer")
    print("=======================================================")

    csv_out = review_dir / "asr-calibration.csv"
    html_out = review_dir / "calibration.html"

    write_calibration_csv("calibration_suite", all_calibration_segments, csv_out)
    generate_calibration_html(
        "MIT 6.006 & 6.0001 Calibration Windows",
        "data/normalized/m4a/mit_6006_cal_window.m4a",
        all_calibration_segments,
        window_start_sec=300.0,
        window_duration_sec=300.0,
        output_path=html_out,
    )

    print(f"[✓] Written {len(all_calibration_segments)} segments to: {csv_out}")
    print(f"[✓] Generated interactive review player:        {html_out}")

    # Save suite JSON
    summary_json = review_dir / "asr_evaluation_results.json"
    summary_json.write_text(json.dumps(suite_results, indent=2))
    print(f"[✓] Saved machine-readable results:            {summary_json}")

    return suite_results


if __name__ == "__main__":
    run_asr_evaluation()
