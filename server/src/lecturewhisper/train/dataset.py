"""Dataset preparation tools for LoRA fine-tuning."""

from __future__ import annotations

import json
import logging
import random
from pathlib import Path
from typing import Any

from lecturewhisper.config import get_settings

logger = logging.getLogger(__name__)


def inject_noise_into_text(text: str, noise_prob: float = 0.1) -> str:
    """
    Simulate typical ASR transcription errors (dropped words, homophones, typos)
    so the fine-tuned model becomes robust to speech recognition noise.
    """
    words = text.split()
    noisy_words: list[str] = []

    for w in words:
        r = random.random()
        if r < noise_prob * 0.4:
            # Drop word
            continue
        elif r < noise_prob * 0.8:
            # Minor typo / lowercase
            noisy_words.append(w.lower().rstrip(".,!?"))
        elif r < noise_prob:
            # Duplicate word (stutter)
            noisy_words.append(w)
            noisy_words.append(w)
        else:
            noisy_words.append(w)

    return " ".join(noisy_words)


def create_training_pair(
    prompt: str,
    target_json: dict[str, Any],
    add_noisy_variant: bool = True,
) -> list[dict[str, str]]:
    """Create clean and optionally ASR-noisy training examples for the same ground truth."""
    target_str = json.dumps(target_json, indent=2)

    examples: list[dict[str, str]] = [
        {"prompt": prompt, "completion": target_str}
    ]

    if add_noisy_variant:
        noisy_prompt = inject_noise_into_text(prompt)
        examples.append({"prompt": noisy_prompt, "completion": target_str})

    return examples


def export_dataset(
    output_dir: Path | str,
    examples: list[dict[str, str]],
    train_ratio: float = 0.8,
) -> tuple[Path, Path]:
    """Split and save dataset into train.jsonl and valid.jsonl."""
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    random.shuffle(examples)
    split_idx = int(len(examples) * train_ratio)

    train_data = examples[:split_idx]
    valid_data = examples[split_idx:]

    train_file = out_path / "train.jsonl"
    valid_file = out_path / "valid.jsonl"

    with open(train_file, "w", encoding="utf-8") as f:
        for item in train_data:
            f.write(json.dumps(item) + "\n")

    with open(valid_file, "w", encoding="utf-8") as f:
        for item in valid_data:
            f.write(json.dumps(item) + "\n")

    logger.info("Exported dataset: %d train, %d valid to %s", len(train_data), len(valid_data), out_path)
    return train_file, valid_file
