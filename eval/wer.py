"""Word Error Rate (WER) computation script."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


def normalize_text(text: str) -> list[str]:
    """Lowercase and strip punctuation for fair acoustic WER comparison."""
    cleaned = re.sub(r"[^\w\s]", "", text.lower())
    return [w for w in cleaned.split() if w]


def levenshtein_distance(ref_words: list[str], hyp_words: list[str]) -> tuple[int, int, int, int]:
    """
    Compute dynamic programming Levenshtein alignment.
    Returns: (substitutions, deletions, insertions, correct)
    """
    r_len = len(ref_words)
    h_len = len(hyp_words)

    # dp[i][j] = (cost, S, D, I)
    dp = [[0] * (h_len + 1) for _ in range(r_len + 1)]

    for i in range(r_len + 1):
        dp[i][0] = i
    for j in range(h_len + 1):
        dp[0][j] = j

    for i in range(1, r_len + 1):
        for j in range(1, h_len + 1):
            if ref_words[i - 1] == hyp_words[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                sub = dp[i - 1][j - 1] + 1
                delete = dp[i - 1][j] + 1
                insert = dp[i][j - 1] + 1
                dp[i][j] = min(sub, delete, insert)

    # Backtrace to count S, D, I, C
    i, j = r_len, h_len
    s, d, ins, c = 0, 0, 0, 0

    while i > 0 or j > 0:
        if i > 0 and j > 0 and ref_words[i - 1] == hyp_words[j - 1]:
            c += 1
            i -= 1
            j -= 1
        elif i > 0 and j > 0 and dp[i][j] == dp[i - 1][j - 1] + 1:
            s += 1
            i -= 1
            j -= 1
        elif i > 0 and dp[i][j] == dp[i - 1][j] + 1:
            d += 1
            i -= 1
        else:
            ins += 1
            j -= 1

    return s, d, ins, c


def compute_wer(hypothesis: str, reference: str) -> dict[str, float | int]:
    """Calculate Word Error Rate and component metrics."""
    hyp_words = normalize_text(hypothesis)
    ref_words = normalize_text(reference)

    if not ref_words:
        wer = 0.0 if not hyp_words else 1.0
        return {
            "wer": wer,
            "substitutions": 0,
            "deletions": 0,
            "insertions": len(hyp_words),
            "correct": 0,
            "ref_words": 0,
            "hyp_words": len(hyp_words),
        }

    s, d, ins, c = levenshtein_distance(ref_words, hyp_words)
    n = len(ref_words)
    wer = round((s + d + ins) / n, 4)

    return {
        "wer": wer,
        "substitutions": s,
        "deletions": d,
        "insertions": ins,
        "correct": c,
        "ref_words": n,
        "hyp_words": len(hyp_words),
    }


def extract_text_from_input(path_or_text: str | Path) -> str:
    """Read plain text or extract full text from a Lecture Whisper transcript JSON."""
    path = Path(path_or_text)
    if not path.exists():
        return str(path_or_text)

    content = path.read_text(encoding="utf-8")
    try:
        data = json.loads(content)
        if isinstance(data, dict) and "segments" in data:
            return " ".join(seg.get("text", "") for seg in data["segments"])
    except json.JSONDecodeError:
        pass

    return content


def main() -> None:
    parser = argparse.ArgumentParser(description="Compute Word Error Rate (WER) between hypothesis and reference.")
    parser.add_argument("--hyp", required=True, help="Path to hypothesis text or transcript JSON")
    parser.add_argument("--ref", required=True, help="Path to hand-corrected reference text file")
    args = parser.parse_args()

    hyp_text = extract_text_from_input(args.hyp)
    ref_text = extract_text_from_input(args.ref)

    metrics = compute_wer(hyp_text, ref_text)

    print("\n--- WER Evaluation Report ---")
    print(f"Reference words:  {metrics['ref_words']}")
    print(f"Hypothesis words: {metrics['hyp_words']}")
    print(f"Correct:          {metrics['correct']}")
    print(f"Substitutions:    {metrics['substitutions']}")
    print(f"Deletions:        {metrics['deletions']}")
    print(f"Insertions:       {metrics['insertions']}")
    print(f"Word Error Rate:  {metrics['wer'] * 100:.2f}%\n")


if __name__ == "__main__":
    main()
