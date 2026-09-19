"""Repeated phrase analysis separating stressed emphasis from verbal habits."""

from __future__ import annotations

import logging
import re
from collections import Counter, defaultdict
from typing import Any

from lecturewhisper.api.schemas import EmphasisPhrase, HabitPhrase, Phrases, Transcript

logger = logging.getLogger(__name__)

# Verbal habits / filler expressions commonly used by speakers
FILLER_LEXICON = {
    "you know",
    "okay so",
    "ok so",
    "kind of",
    "sort of",
    "basically",
    "actually",
    "like i said",
    "as i said",
    "right so",
    "makes sense",
    "does that make sense",
    "if you will",
    "to be honest",
    "so yeah",
    "and so on",
}

# Stop words to exclude from emphasis phrases
STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "is", "are", "was", "were", "it", "this", "that", "these", "those", "i", "we", "you",
}


class PhraseAnalyzer:
    """Extracts repeated content phrases (emphasis) and verbal fillers (habits)."""

    @classmethod
    def analyze(
        cls,
        transcript: Transcript,
        min_emphasis_count: int = 2,
        min_habit_count: int = 2,
    ) -> Phrases:
        """Process transcript into emphasis phrases and habit phrases."""
        habit_counts: Counter[str] = Counter()
        phrase_spans: dict[str, list[tuple[float, float]]] = defaultdict(list)

        # 1. Scan for verbal habits
        full_text = " ".join(seg.text for seg in transcript.segments).lower()
        for filler in FILLER_LEXICON:
            pattern = rf"\b{re.escape(filler)}\b"
            matches = list(re.finditer(pattern, full_text))
            if len(matches) >= min_habit_count:
                habit_counts[filler] = len(matches)

        # 2. Extract n-grams (2-grams, 3-grams) for emphasis
        for seg in transcript.segments:
            words = re.findall(r"\b[a-zA-Z]{3,}\b", seg.text.lower())
            # Bigrams
            for i in range(len(words) - 1):
                w1, w2 = words[i], words[i + 1]
                if w1 in STOP_WORDS and w2 in STOP_WORDS:
                    continue
                bigram = f"{w1} {w2}"
                if bigram not in FILLER_LEXICON:
                    phrase_spans[bigram].append((seg.start, seg.end))

            # Trigrams
            for i in range(len(words) - 2):
                w1, w2, w3 = words[i], words[i + 1], words[i + 2]
                if w1 in STOP_WORDS and w2 in STOP_WORDS and w3 in STOP_WORDS:
                    continue
                trigram = f"{w1} {w2} {w3}"
                if trigram not in FILLER_LEXICON:
                    phrase_spans[trigram].append((seg.start, seg.end))

        # 3. Filter emphasis phrases by count and remove sub-phrases
        emphasis_list: list[EmphasisPhrase] = []
        for phrase, spans in sorted(phrase_spans.items(), key=lambda x: len(x[1]), reverse=True):
            if len(spans) >= min_emphasis_count:
                emphasis_list.append(
                    EmphasisPhrase(
                        phrase=phrase,
                        count=len(spans),
                        spans=spans[:10],  # Keep first 10 occurrences
                    )
                )
            if len(emphasis_list) >= 20:  # Cap at top 20 emphasis phrases
                break

        habits_list: list[HabitPhrase] = [
            HabitPhrase(phrase=f, count=c)
            for f, c in habit_counts.most_common(20)
        ]

        logger.info(
            "Analyzed phrases: %d emphasis items, %d habit items",
            len(emphasis_list),
            len(habits_list),
        )

        return Phrases(
            emphasis=emphasis_list,
            habits=habits_list,
        )
