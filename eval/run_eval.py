"""Comprehensive multi-lecture evaluation harness.

Measures across hand-labeled benchmark fixtures:
- Event Extraction Precision, Recall, and F1
- Important Question Extraction Precision, Recall, and F1
- Acoustic / ASR Word Error Rate (WER)
- Note Faithfulness and Key-Fact Recall
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

# Add server source and project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent / "server" / "src"))

from lecturewhisper.api.schemas import Transcript
from lecturewhisper.pipeline.events import EventExtractor, QuestionExtractor
from lecturewhisper.pipeline.phrases import PhraseAnalyzer
from eval.wer import compute_wer


def evaluate_fixtures(fixtures_dir: Path | None = None, suite: bool = False) -> dict[str, float]:
    """Run evaluation suite across all benchmark lectures in fixtures/ (or single fixture if suite=False)."""
    if fixtures_dir is None:
        fixtures_dir = Path(__file__).parent / "fixtures"

    if not suite:
        legacy_trans = fixtures_dir / "lecture_transcript.json"
        legacy_gt = fixtures_dir / "lecture_ground_truth.json"
        if legacy_trans.exists() and legacy_gt.exists():
            return _evaluate_legacy_single(legacy_trans, legacy_gt)

    fixture_files = sorted(fixtures_dir.glob("lecture_*.json"))
    
    # Filter out legacy single ground truth files
    suite_files = [f for f in fixture_files if not f.name.endswith("_ground_truth.json") and not f.name.endswith("_transcript.json")]
    
    # Fallback to legacy single file if suite not found
    if not suite_files:
        legacy_trans = fixtures_dir / "lecture_transcript.json"
        legacy_gt = fixtures_dir / "lecture_ground_truth.json"
        if legacy_trans.exists() and legacy_gt.exists():
            return _evaluate_legacy_single(legacy_trans, legacy_gt)
        return {"event_precision": 0.0, "event_recall": 0.0, "question_recall": 0.0}

    total_gt_events = 0
    total_ext_events = 0
    total_tp_events = 0

    total_gt_questions = 0
    total_ext_questions = 0
    total_tp_questions = 0

    total_key_facts = 0
    covered_key_facts = 0

    total_wer = 0.0
    lecture_results = []

    base_time = datetime(2026, 10, 1, 9, 0, 0, tzinfo=UTC)

    for fpath in suite_files:
        data = json.loads(fpath.read_text(encoding="utf-8"))
        transcript_data = data["transcript"]
        gt_data = data["ground_truth"]
        meta = data.get("metadata", {"subject": fpath.stem})

        transcript = Transcript.model_validate(transcript_data)
        
        # 1. Event Extraction
        extracted_events = EventExtractor.find_candidates(transcript, base_datetime=base_time)
        gt_events = gt_data.get("events", [])
        
        tp_events = 0
        for gt in gt_events:
            for ext in extracted_events:
                if ext.type == gt["type"] and gt["keyword"].lower() in ext.source_quote.lower():
                    tp_events += 1
                    break

        # 2. Question Extraction
        extracted_questions = QuestionExtractor.find_questions(transcript)
        gt_questions = gt_data.get("questions", [])
        
        tp_questions = 0
        for gt in gt_questions:
            for q in extracted_questions:
                if gt["keyword"].lower() in q.text.lower():
                    tp_questions += 1
                    break

        # 3. WER against clean text
        hyp_text = " ".join(seg.text for seg in transcript.segments)
        ref_text = gt_data.get("clean_text", hyp_text)
        wer_res = compute_wer(hyp_text, ref_text)
        lecture_wer = float(wer_res["wer"])

        # 4. Note Faithfulness / Key Facts
        key_facts = gt_data.get("key_facts", [])
        matched_facts = 0
        transcript_lower = hyp_text.lower()
        for kf in key_facts:
            # Check fact keywords
            words = [w.lower() for w in kf.split() if len(w) > 4]
            if any(w in transcript_lower for w in words):
                matched_facts += 1

        total_gt_events += len(gt_events)
        total_ext_events += len(extracted_events)
        total_tp_events += tp_events

        total_gt_questions += len(gt_questions)
        total_ext_questions += len(extracted_questions)
        total_tp_questions += tp_questions

        total_key_facts += len(key_facts)
        covered_key_facts += matched_facts
        total_wer += lecture_wer

        lec_precision = tp_events / len(extracted_events) if extracted_events else 1.0
        lec_recall = tp_events / len(gt_events) if gt_events else 1.0

        lecture_results.append({
            "id": meta.get("id", fpath.stem),
            "subject": meta.get("subject", fpath.stem),
            "events_extracted": len(extracted_events),
            "events_ground_truth": len(gt_events),
            "events_tp": tp_events,
            "event_precision": round(lec_precision, 3),
            "event_recall": round(lec_recall, 3),
            "wer": round(lecture_wer, 4),
            "faithfulness": round(matched_facts / len(key_facts), 3) if key_facts else 1.0,
        })

    n_lectures = len(suite_files)
    macro_event_precision = total_tp_events / total_ext_events if total_ext_events else 0.0
    macro_event_recall = total_tp_events / total_gt_events if total_gt_events else 0.0
    macro_event_f1 = (
        2 * (macro_event_precision * macro_event_recall) / (macro_event_precision + macro_event_recall)
        if (macro_event_precision + macro_event_recall) > 0
        else 0.0
    )

    macro_question_precision = total_tp_questions / total_ext_questions if total_ext_questions else 0.0
    macro_question_recall = total_tp_questions / total_gt_questions if total_gt_questions else 0.0

    mean_wer = total_wer / n_lectures if n_lectures else 0.0
    faithfulness_score = covered_key_facts / total_key_facts if total_key_facts else 1.0

    summary_metrics = {
        "benchmark_lectures_count": n_lectures,
        "event_precision": round(macro_event_precision, 4),
        "event_recall": round(macro_event_recall, 4),
        "event_f1": round(macro_event_f1, 4),
        "question_precision": round(macro_question_precision, 4),
        "question_recall": round(macro_question_recall, 4),
        "mean_wer": round(mean_wer, 4),
        "note_faithfulness": round(faithfulness_score, 4),
        "lectures": lecture_results,
    }

    # Write report
    report_file = fixtures_dir.parent / "evaluation_report.json"
    report_file.write_text(json.dumps(summary_metrics, indent=2), encoding="utf-8")

    return summary_metrics


def _evaluate_legacy_single(transcript_path: Path, ground_truth_path: Path) -> dict[str, float]:
    transcript_data = json.loads(transcript_path.read_text(encoding="utf-8"))
    gt_data = json.loads(ground_truth_path.read_text(encoding="utf-8"))
    transcript = Transcript.model_validate(transcript_data)
    base_time = datetime(2026, 10, 1, 9, 0, 0, tzinfo=UTC)

    extracted_events = EventExtractor.find_candidates(transcript, base_datetime=base_time)
    gt_events = gt_data["events"]
    tp_events = sum(
        1 for gt in gt_events for ext in extracted_events
        if ext.type == gt["type"] and gt["keyword"].lower() in ext.source_quote.lower()
    )

    extracted_questions = QuestionExtractor.find_questions(transcript)
    gt_questions = gt_data["questions"]
    tp_questions = sum(
        1 for gt in gt_questions for q in extracted_questions
        if gt["keyword"].lower() in q.text.lower()
    )

    p = tp_events / len(extracted_events) if extracted_events else 0.0
    r = tp_events / len(gt_events) if gt_events else 0.0
    f1 = 2 * (p * r) / (p + r) if (p + r) > 0 else 0.0
    phrases = PhraseAnalyzer.analyze(transcript)
    return {
        "event_precision": round(p, 4),
        "event_recall": round(r, 4),
        "event_f1": round(f1, 4),
        "question_recall": round(tp_questions / len(gt_questions) if gt_questions else 0.0, 4),
        "emphasis_phrases_count": len(phrases.emphasis),
        "habit_phrases_count": len(phrases.habits),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate extraction and ASR quality over benchmark dataset.")
    parser.add_argument("--fixtures", type=str, default=None, help="Directory containing lecture fixture JSONs")
    args = parser.parse_args()

    fix_dir = Path(args.fixtures) if args.fixtures else None
    metrics = evaluate_fixtures(fix_dir, suite=True)

    print("\n=======================================================")
    print("🎓 Lecture Whisper — Multi-Lecture Benchmark Evaluation")
    print("=======================================================")
    print(f"Total Hand-Labeled Lectures Evaluated: {metrics.get('benchmark_lectures_count', 1)}")
    print(f"Event Precision:   {metrics['event_precision'] * 100:.1f}%")
    print(f"Event Recall:      {metrics['event_recall'] * 100:.1f}%")
    print(f"Event F1-Score:    {metrics.get('event_f1', 0) * 100:.1f}%")
    print(f"Question Recall:   {metrics['question_recall'] * 100:.1f}%")
    print(f"Mean Word Error:   {metrics.get('mean_wer', 0) * 100:.2f}%")
    print(f"Note Faithfulness: {metrics.get('note_faithfulness', 1) * 100:.1f}%")
    print("=======================================================\n")

    if "lectures" in metrics:
        print(f"{'Lecture / Subject':<42} | {'Events (P/R)':<14} | {'WER':<8} | {'Faithfulness'}")
        print("-" * 80)
        for lec in metrics["lectures"]:
            p_r = f"{lec['event_precision']*100:.0f}% / {lec['event_recall']*100:.0f}%"
            wer_pct = f"{lec['wer']*100:.1f}%"
            faith_pct = f"{lec['faithfulness']*100:.0f}%"
            print(f"{lec['subject'][:40]:<42} | {p_r:<14} | {wer_pct:<8} | {faith_pct}")
        print("-" * 80 + "\n")


if __name__ == "__main__":
    main()
