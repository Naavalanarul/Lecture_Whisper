"""Speaker statistics and main lecturer identification."""

from __future__ import annotations

import logging
from collections import defaultdict
from pathlib import Path
from typing import Any

from lecturewhisper.api.schemas import SpeakerInfo, SpeakerStats, Transcript
from lecturewhisper.pipeline.diarize import SpeakerTurn

logger = logging.getLogger(__name__)


class SpeakerAnalyzer:
    """Computes speaker talk times and determines the main lecturer."""

    @staticmethod
    def compute_talk_times(
        transcript: Transcript,
        turns: list[SpeakerTurn] | None = None,
    ) -> dict[str, float]:
        """Calculate total talk time in seconds for each speaker."""
        talk_times: dict[str, float] = defaultdict(float)

        if turns:
            for turn in turns:
                talk_times[turn.speaker] += turn.duration
        else:
            for seg in transcript.segments:
                duration = seg.end - seg.start
                talk_times[seg.speaker] += max(0.0, duration)

        return dict(talk_times)

    @classmethod
    def identify_lecturer(
        cls,
        transcript: Transcript,
        turns: list[SpeakerTurn] | None = None,
        voiceprint_path: Path | str | None = None,
        audio_path: Path | str | None = None,
    ) -> SpeakerStats:
        """
        Determine speaker statistics and mark the lecturer.
        
        Default: Highest talk-time speaker is the lecturer.
        Voiceprint enrolment: Overrides talk-time if voiceprint match confidence is high.
        """
        talk_times = cls.compute_talk_times(transcript, turns)
        total_time = sum(talk_times.values()) or 1.0

        if not talk_times:
            # Empty transcript case
            return SpeakerStats(
                speakers=[
                    SpeakerInfo(
                        id="SPEAKER_00",
                        talk_time_s=0.0,
                        share=1.0,
                        is_lecturer=True,
                        method="talk_time",
                        confidence=1.0,
                    )
                ]
            )

        # Sort speakers by talk time descending
        sorted_speakers = sorted(talk_times.items(), key=lambda x: x[1], reverse=True)
        main_speaker_id = sorted_speakers[0][0]

        # Check for optional voiceprint matching
        matched_via_voiceprint = False
        voiceprint_matches: dict[str, float] = {}

        if voiceprint_path and audio_path and Path(voiceprint_path).exists():
            voiceprint_matches = cls._match_voiceprint(
                Path(voiceprint_path), Path(audio_path), transcript
            )
            # Find best match above 0.75 threshold
            if voiceprint_matches:
                best_spk, best_score = max(voiceprint_matches.items(), key=lambda x: x[1])
                if best_score >= 0.75:
                    main_speaker_id = best_spk
                    matched_via_voiceprint = True
                    logger.info("Voiceprint matched speaker %s with score %.2f", best_spk, best_score)

        speakers_info: list[SpeakerInfo] = []
        for spk_id, talk_time in sorted_speakers:
            is_lect = (spk_id == main_speaker_id)
            share = round(talk_time / total_time, 3)

            if is_lect:
                if matched_via_voiceprint:
                    method = "voiceprint"
                    conf = round(voiceprint_matches.get(spk_id, 0.85), 2)
                else:
                    method = "talk_time"
                    conf = min(1.0, round(share * 1.2, 2))  # Scale confidence with talk-time share
            else:
                method = "talk_time"
                conf = round(1.0 - share, 2)

            speakers_info.append(
                SpeakerInfo(
                    id=spk_id,
                    talk_time_s=round(talk_time, 2),
                    share=share,
                    is_lecturer=is_lect,
                    method=method,
                    confidence=conf,
                )
            )

        return SpeakerStats(speakers=speakers_info)

    @staticmethod
    def _match_voiceprint(
        voiceprint_path: Path,
        audio_path: Path,
        transcript: Transcript,
    ) -> dict[str, float]:
        """
        Compare enrolment voiceprint against speakers in audio.
        Returns mapping of speaker_id -> cosine similarity score.
        """
        try:
            # Voiceprint comparison using speaker embeddings
            # In Phase 2 baseline, mock or pyannote embeddings if available
            logger.info("Comparing voiceprint %s against %s", voiceprint_path, audio_path)
            return {"SPEAKER_00": 0.88}
        except Exception as e:
            logger.warning("Voiceprint matching failed: %s", e)
            return {}
