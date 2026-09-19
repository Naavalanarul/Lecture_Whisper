"""Evaluation runner measuring precision and recall on hand-labelled fixtures."""

from __future__ import annotations

import json
import sys
from datetime import UTC, datetime
from pathlib import Path

# Add server source to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent / "server" / "src"))

from lecturewhisper.api.schemas import Transcript
from lecturewhisper.pipeline.events import EventExtractor, QuestionExtractor
from lecturewhisper.pipeline.phrases import PhraseAnalyzer


def evaluate_fixtures(fixtures_dir: Path | None = None) -> dict[str, float]:
    """Run extraction evaluation against golden fixtures and calculate precision/recall."""
    if fixtures_dir is None:
        fixtures_dir = Path(__file__).parent / "fixtures"

    transcript_path = fixtures_dir / "lecture_transcript.json"
    ground_truth_path = fixtures_dir / "lecture_ground_truth.json"

    transcript_data = json.loads(transcript_path.read_text(encoding="utf-8"))
    gt_data = json.loads(ground_truth_path.read_text(encoding="utf-8"))

    transcript = Transcript.model_validate(transcript_data)
    base_time = datetime(2026, 10, 1, 9, 0, 0, tzinfo=UTC)

    # 1. Event Extraction
    extracted_events = EventExtractor.find_candidates(transcript, base_datetime=base_time)
    gt_events = gt_data["events"]

    # Match events
    true_positive_events = 0
    for gt in gt_events:
        for ext in extracted_events:
            if ext.type == gt["type"] and gt["keyword"].lower() in ext.source_quote.lower():
                true_positive_events += 1
                break

    event_precision = true_positive_events / len(extracted_events) if extracted_events else 0.0
    event_recall = true_positive_events / len(gt_events) if gt_events else 0.0
    event_f1 = (
        2 * (event_precision * event_recall) / (event_precision + event_recall)
        if (event_precision + event_recall) > 0
        else 0.0
    )

    # 2. Question Extraction
    extracted_questions = QuestionExtractor.find_questions(transcript)
    gt_questions = gt_data["questions"]

    true_positive_questions = 0
    for gt in gt_questions:
        for q in extracted_questions:
            if gt["keyword"].lower() in q.text.lower():
                true_positive_questions += 1
                break

    q_precision = true_positive_questions / len(extracted_questions) if extracted_questions else 0.0
    q_recall = true_positive_questions / len(gt_questions) if gt_questions else 0.0

    # 3. Phrase analysis check
    phrases = PhraseAnalyzer.analyze(transcript)

    results = {
        "event_precision": round(event_precision, 3),
        "event_recall": round(event_recall, 3),
        "event_f1": round(event_f1, 3),
        "extracted_events_count": len(extracted_events),
        "ground_truth_events_count": len(gt_events),
        "question_precision": round(q_precision, 3),
        "question_recall": round(q_recall, 3),
        "extracted_questions_count": len(extracted_questions),
        "ground_truth_questions_count": len(gt_questions),
        "emphasis_phrases_count": len(phrases.emphasis),
        "habit_phrases_count": len(phrases.habits),
    }

    return results


def main() -> None:
    results = evaluate_fixtures()

    print("\n==========================================")
    print("      LECTURE WHISPER EVALUATION REPORT   ")
    print("==========================================")
    print(f"Events Extracted:          {results['extracted_events_count']} (GT: {results['ground_truth_events_count']})")
    print(f"Event Precision:           {results['event_precision'] * 100:.1f}%")
    print(f"Event Recall:              {results['event_recall'] * 100:.1f}%")
    print(f"Event F1 Score:            {results['event_f1'] * 100:.1f}%")
    print("------------------------------------------")
    print(f"Questions Extracted:       {results['extracted_questions_count']} (GT: {results['ground_truth_questions_count']})")
    print(f"Question Precision:        {results['question_precision'] * 100:.1f}%")
    print(f"Question Recall:           {results['question_recall'] * 100:.1f}%")
    print("------------------------------------------")
    print(f"Emphasis Phrases:          {results['emphasis_phrases_count']}")
    print(f"Habit Fillers:             {results['habit_phrases_count']}")
    print("==========================================\n")


if __name__ == "__main__":
    main()
