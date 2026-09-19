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
        """Process transcript into emphasis phrases and habit phrases with real context snippets."""
        habit_occurrences: dict[str, list[tuple[float, float, str]]] = defaultdict(list)
        phrase_occurrences: dict[str, list[tuple[float, float, str]]] = defaultdict(list)

        # 1. Scan segments for verbal habits and n-grams
        for seg in transcript.segments:
            seg_text = seg.text.strip()
            lower_text = seg_text.lower()

            # Habits scan
            for filler in FILLER_LEXICON:
                pattern = rf"\b{re.escape(filler)}\b"
                if re.search(pattern, lower_text):
                    habit_occurrences[filler].append((seg.start, seg.end, seg_text))

            # 2. Extract n-grams (2-grams, 3-grams) for emphasis
            words = re.findall(r"\b[a-zA-Z]{3,}\b", lower_text)
            # Bigrams
            for i in range(len(words) - 1):
                w1, w2 = words[i], words[i + 1]
                if w1 in STOP_WORDS and w2 in STOP_WORDS:
                    continue
                bigram = f"{w1} {w2}"
                if bigram not in FILLER_LEXICON:
                    phrase_occurrences[bigram].append((seg.start, seg.end, seg_text))

            # Trigrams
            for i in range(len(words) - 2):
                w1, w2, w3 = words[i], words[i + 1], words[i + 2]
                if w1 in STOP_WORDS and w2 in STOP_WORDS and w3 in STOP_WORDS:
                    continue
                trigram = f"{w1} {w2} {w3}"
                if trigram not in FILLER_LEXICON:
                    phrase_occurrences[trigram].append((seg.start, seg.end, seg_text))

        # 3. Build emphasis list
        emphasis_list: list[EmphasisPhrase] = []
        for phrase, occs in sorted(phrase_occurrences.items(), key=lambda x: len(x[1]), reverse=True):
            if len(occs) >= min_emphasis_count:
                spans = [(start, end) for start, end, _ in occs[:10]]
                first_snippet = occs[0][2]
                emphasis_list.append(
                    EmphasisPhrase(
                        phrase=phrase,
                        count=len(occs),
                        spans=spans,
                        context_snippet=first_snippet,
                        description=f"Key technical subject concept '{phrase}' reinforced {len(occs)} times.",
                    )
                )
            if len(emphasis_list) >= 20:  # Cap at top 20
                break

        # 4. Build habits list
        habits_list: list[HabitPhrase] = []
        for filler, occs in sorted(habit_occurrences.items(), key=lambda x: len(x[1]), reverse=True):
            count = len(occs)
            if count >= min_habit_count:
                first_s = occs[0][0]
                last_s = occs[-1][0]
                inter_arrival = round((last_s - first_s) / (count - 1), 2) if count > 1 else None
                first_snippet = occs[0][2]
                habits_list.append(
                    HabitPhrase(
                        phrase=filler,
                        count=count,
                        context_snippet=first_snippet,
                        first_occurrence_s=first_s,
                        last_occurrence_s=last_s,
                        mean_inter_arrival_s=inter_arrival,
                        description=f"Frequent verbal cadence phrase '{filler}' repeated {count} times.",
                    )
                )
            if len(habits_list) >= 20:
                break

        logger.info(
            "Analyzed phrases: %d emphasis items, %d habit items",
            len(emphasis_list),
            len(habits_list),
        )

        return Phrases(
            emphasis=emphasis_list,
            habits=habits_list,
        )
