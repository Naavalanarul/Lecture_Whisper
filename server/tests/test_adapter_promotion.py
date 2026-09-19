"""Unit tests for Adapter Promotion Gate (A5)."""

import pytest
from lecturewhisper.train.evaluate import AdapterEvaluator, EvalMetrics


def test_reject_promotion_when_insufficient_human_pairs():
    """Adapter must NOT be promoted if held-out human-verified pairs < 50."""
    evaluator = AdapterEvaluator(min_human_pairs=50)

    # Human pair count = 12 (< 50)
    baseline = EvalMetrics(json_validity_rate=0.92, event_precision=0.75, event_recall=0.80, hallucination_rate=0.08, rouge_l=0.62, wer=0.18)
    adapter = EvalMetrics(json_validity_rate=0.98, event_precision=0.88, event_recall=0.92, hallucination_rate=0.03, rouge_l=0.74, wer=0.12)

    decision = evaluator.decide_promotion(baseline, adapter, human_pair_count=12)
    assert decision.promoted is False
    assert "Requires evaluation on >=50 verified pairs with WER < baseline" in decision.reason
    assert "Current: 12 pairs" in decision.reason


def test_reject_promotion_when_wer_not_better():
    """Adapter must NOT be promoted if adapter WER >= baseline WER, even if N >= 50."""
    evaluator = AdapterEvaluator(min_human_pairs=50)

    # 60 human pairs, but adapter WER is worse (0.22 vs 0.18)
    baseline = EvalMetrics(json_validity_rate=0.92, event_precision=0.75, event_recall=0.80, hallucination_rate=0.08, rouge_l=0.62, wer=0.18)
    adapter = EvalMetrics(json_validity_rate=0.98, event_precision=0.88, event_recall=0.92, hallucination_rate=0.03, rouge_l=0.74, wer=0.22)

    decision = evaluator.decide_promotion(baseline, adapter, human_pair_count=60)
    assert decision.promoted is False
    assert "WER" in decision.reason


def test_promote_when_pairs_ge_50_and_wer_lower():
    """Adapter is promoted ONLY when evaluated on >= 50 human pairs AND adapter WER < baseline."""
    evaluator = AdapterEvaluator(min_human_pairs=50)

    baseline = EvalMetrics(json_validity_rate=0.92, event_precision=0.75, event_recall=0.80, hallucination_rate=0.08, rouge_l=0.62, wer=0.18)
    adapter = EvalMetrics(json_validity_rate=0.98, event_precision=0.88, event_recall=0.92, hallucination_rate=0.03, rouge_l=0.74, wer=0.12)

    decision = evaluator.decide_promotion(baseline, adapter, human_pair_count=55)
    assert decision.promoted is True
    assert decision.human_pair_count == 55
    assert decision.baseline_wer == 0.18
    assert decision.adapter_wer == 0.12
