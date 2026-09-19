"""Tests for Phase 8 fine-tuning dataset generation, training loop, and evaluation harness."""

from __future__ import annotations

import json
from pathlib import Path
from uuid import uuid4

import pytest
from sqlmodel import Session, SQLModel, create_engine

from lecturewhisper.train.corrections import (
    export_corrections_as_training_pairs,
    record_correction,
)
from lecturewhisper.train.dataset import (
    create_training_pair,
    export_dataset,
    inject_noise_into_text,
)
from lecturewhisper.train.evaluate import AdapterEvaluator, EvalMetrics
from lecturewhisper.train.teacher import TeacherGenerator, TeacherType
from lecturewhisper.train.train import LoRATrainer


def test_inject_noise_into_text() -> None:
    """inject_noise_into_text should produce perturbed variations of original text."""
    text = "The neural network calculates loss through backpropagation."
    noisy = inject_noise_into_text(text, noise_prob=0.8)
    assert len(noisy) > 0


def test_create_and_export_dataset(tmp_path: Path) -> None:
    """create_training_pair and export_dataset should produce valid train.jsonl and valid.jsonl."""
    pairs = create_training_pair(
        prompt="Explain backpropagation in one sentence.",
        target_json={"summary": "Backpropagation computes gradients of the loss function via chain rule."},
        add_noisy_variant=True,
    )
    assert len(pairs) == 2  # Clean + noisy variant

    train_f, valid_f = export_dataset(tmp_path, pairs, train_ratio=0.5)
    assert train_f.exists()
    assert valid_f.exists()

    train_lines = train_f.read_text(encoding="utf-8").strip().split("\n")
    assert len(train_lines) >= 1
    sample = json.loads(train_lines[0])
    assert "prompt" in sample
    assert "completion" in sample


def test_human_corrections_loop(tmp_path: Path) -> None:
    """record_correction should persist in SQLite and export as training pairs."""
    db_file = tmp_path / "test_corr.db"
    engine = create_engine(f"sqlite:///{db_file}")
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        rec_id = uuid4()
        corr = record_correction(
            session,
            recording_id=rec_id,
            field="transcript",
            original_value="the quick brown fox jumped over",
            corrected_value="the quick brown fox jumps over",
        )
        assert corr.id is not None

        exported_pairs = export_corrections_as_training_pairs(session)
        assert len(exported_pairs) == 1
        assert "jumps" in exported_pairs[0]["completion"]


def test_teacher_privacy_enforcement() -> None:
    """Cloud teacher generation must raise PermissionError without explicit confirmation."""
    # Local teacher works by default
    local_teacher = TeacherGenerator(teacher_type=TeacherType.LOCAL)
    res = local_teacher.generate_target("Sample lecture content")
    assert "summary" in res

    # Cloud teacher requires confirmation
    with pytest.raises(PermissionError) as exc_info:
        TeacherGenerator(teacher_type=TeacherType.CLOUD, cloud_confirmed=False)
    assert "PRIVACY WARNING" in str(exc_info.value)


def test_lora_trainer_and_adapter_versioning(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """LoRATrainer should increment adapter versions in adapters directory."""
    monkeypatch.setenv("LW_DATA_DIR", str(tmp_path))

    trainer = LoRATrainer()
    res1 = trainer.train(tmp_path, iters=5, batch_size=1)
    assert res1.version == 1
    assert res1.adapter_path.exists()

    res2 = trainer.train(tmp_path, iters=5, batch_size=1)
    assert res2.version == 2
    assert res2.adapter_path.exists()


def test_adapter_evaluator_decision() -> None:
    """AdapterEvaluator should promote adapter only if it beats baseline."""
    evaluator = AdapterEvaluator()

    baseline_metrics = EvalMetrics(
        json_validity_rate=0.90,
        event_precision=0.70,
        event_recall=0.75,
        hallucination_rate=0.10,
        rouge_l=0.60,
        wer=0.18,
    )

    better_adapter_metrics = EvalMetrics(
        json_validity_rate=0.98,
        event_precision=0.88,
        event_recall=0.90,
        hallucination_rate=0.02,
        rouge_l=0.75,
        wer=0.12,
    )

    decision = evaluator.decide_promotion(baseline_metrics, better_adapter_metrics, human_pair_count=50)
    assert decision.promoted is True

    worse_adapter_metrics = EvalMetrics(
        json_validity_rate=0.80,
        event_precision=0.60,
        event_recall=0.65,
        hallucination_rate=0.20,
        rouge_l=0.50,
        wer=0.25,
    )

    decision_worse = evaluator.decide_promotion(baseline_metrics, worse_adapter_metrics, human_pair_count=50)
    assert decision_worse.promoted is False
