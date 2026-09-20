"""
Unified Transcript Parsers for Lecture Whisper Evaluation Suite.

Supports:
- SubRip Subtitles (.srt)
- WebVTT Captions (.vtt)
- Transcript PDFs (.pdf)
- MICASE XML Transcripts (.xml)

All parsers output a unified schema of timed segments with speaker attribution.
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Union


@dataclass
class TranscriptSegment:
    """A single continuous segment of transcribed speech with timing and speaker."""
    start_sec: float
    end_sec: float
    text: str
    speaker: Optional[str] = None

    def __post_init__(self) -> None:
        self.start_sec = round(float(self.start_sec), 3)
        self.end_sec = round(float(self.end_sec), 3)
        self.text = self.text.strip()
        if self.end_sec < self.start_sec:
            # Clamp inverted timestamps to zero duration
            self.end_sec = self.start_sec


@dataclass
class UnifiedTranscript:
    """Standardized multi-segment transcript."""
    recording_id: str
    source_format: str
    segments: List[TranscriptSegment]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "recording_id": self.recording_id,
            "source_format": self.source_format,
            "segments": [asdict(s) for s in self.segments],
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> UnifiedTranscript:
        return cls(
            recording_id=data.get("recording_id", "recording"),
            source_format=data.get("source_format", "json"),
            segments=[
                TranscriptSegment(
                    start_sec=s["start_sec"],
                    end_sec=s["end_sec"],
                    text=s["text"],
                    speaker=s.get("speaker"),
                )
                for s in data.get("segments", [])
            ],
        )

    @property
    def full_text(self) -> str:
        return " ".join(s.text for s in self.segments if s.text)

    @property
    def total_duration_sec(self) -> float:
        if not self.segments:
            return 0.0
        return max(s.end_sec for s in self.segments)


# Regex patterns for time parsing
_SRT_TIME_RE = re.compile(
    r"(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})"
)
_VTT_SHORT_TIME_RE = re.compile(
    r"(\d{1,2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{1,2}):(\d{2})[,.](\d{3})"
)
_SPEAKER_PREFIX_RE = re.compile(r"^([A-Z0-9\s._'-]{2,25}):\s*(.*)$")
_BRACKET_NOISE_RE = re.compile(r"\[[A-Z\s,._-]+\]")
_PAREN_NOISE_RE = re.compile(r"\([A-Z\s,._-]+\)")
_VTT_VOICE_TAG_RE = re.compile(r"<v(?:\s+([^>]+))?>([^<]*)</v>")
_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _parse_timecode_to_sec(
    h_or_m: int, m_or_s: int, s_or_ms: int, ms: int, is_short: bool = False
) -> float:
    if is_short:
        # m_or_s is minutes, s_or_ms is seconds, ms is milliseconds
        return h_or_m * 60.0 + m_or_s + ms / 1000.0
    return h_or_m * 3600.0 + m_or_s * 60.0 + s_or_ms + ms / 1000.0


def _clean_caption_text(text: str) -> tuple[str, Optional[str]]:
    """Clean caption text, removing noise tags and extracting speaker prefixes."""
    # Check for WebVTT <v Speaker> tag
    voice_match = _VTT_VOICE_TAG_RE.search(text)
    detected_speaker = None
    if voice_match:
        detected_speaker = voice_match.group(1)
        text = _VTT_VOICE_TAG_RE.sub(r"\2", text)

    # Strip HTML tags
    text = _HTML_TAG_RE.sub("", text)
    # Strip bracketed noise (e.g. [LAUGHTER], [SQUEAKING])
    text = _BRACKET_NOISE_RE.sub("", text)
    # Strip parenthesized noise (e.g. (inaudible))
    text = _PAREN_NOISE_RE.sub("", text)

    # Normalize whitespace
    text = " ".join(text.split()).strip()

    # Check for speaker prefix like "JASON KU: text" or ">> SPEAKER: text"
    text = re.sub(r"^>>\s*", "", text)
    speaker_match = _SPEAKER_PREFIX_RE.match(text)
    if speaker_match and not detected_speaker:
        potential_speaker = speaker_match.group(1).strip()
        # Avoid false positives for regular words like "NOTE" or "WARNING"
        if not potential_speaker.lower() in ("note", "warning", "tip", "important"):
            detected_speaker = potential_speaker
            text = speaker_match.group(2).strip()

    return text, detected_speaker


def parse_srt(content: str, recording_id: str = "recording") -> UnifiedTranscript:
    """Parse a SubRip (.srt) subtitle string into UnifiedTranscript."""
    blocks = re.split(r"\n\s*\n", content.strip())
    segments: List[TranscriptSegment] = []
    current_speaker: Optional[str] = None

    for block in blocks:
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if len(lines) < 2:
            continue

        # Find timestamp line
        time_line_idx = -1
        time_match = None
        for idx, line in enumerate(lines[:3]):
            m = _SRT_TIME_RE.search(line)
            if m:
                time_line_idx = idx
                time_match = m
                break

        if not time_match:
            continue

        h1, m1, s1, ms1, h2, m2, s2, ms2 = map(int, time_match.groups())
        start_sec = _parse_timecode_to_sec(h1, m1, s1, ms1)
        end_sec = _parse_timecode_to_sec(h2, m2, s2, ms2)

        raw_text = " ".join(lines[time_line_idx + 1:])
        cleaned_text, speaker = _clean_caption_text(raw_text)
        if speaker:
            current_speaker = speaker

        if cleaned_text:
            segments.append(
                TranscriptSegment(
                    start_sec=start_sec,
                    end_sec=end_sec,
                    text=cleaned_text,
                    speaker=current_speaker,
                )
            )

    return UnifiedTranscript(recording_id=recording_id, source_format="srt", segments=segments)


def parse_vtt(content: str, recording_id: str = "recording") -> UnifiedTranscript:
    """Parse a WebVTT (.vtt) caption string into UnifiedTranscript."""
    lines = content.splitlines()
    segments: List[TranscriptSegment] = []
    current_speaker: Optional[str] = None

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Skip headers and comments
        if not line or line.startswith("WEBVTT") or line.startswith("NOTE"):
            i += 1
            continue

        # Try matching standard timestamp or short timestamp
        time_match = _SRT_TIME_RE.search(line)
        is_short = False
        if not time_match:
            time_match = _VTT_SHORT_TIME_RE.search(line)
            is_short = True

        if time_match:
            if is_short:
                m1, s1, ms1, m2, s2, ms2 = map(int, time_match.groups())
                start_sec = _parse_timecode_to_sec(m1, s1, ms1, 0, is_short=True)
                end_sec = _parse_timecode_to_sec(m2, s2, ms2, 0, is_short=True)
            else:
                h1, m1, s1, ms1, h2, m2, s2, ms2 = map(int, time_match.groups())
                start_sec = _parse_timecode_to_sec(h1, m1, s1, ms1)
                end_sec = _parse_timecode_to_sec(h2, m2, s2, ms2)

            # Collect text lines until next blank line
            i += 1
            text_lines = []
            while i < len(lines) and lines[i].strip():
                text_lines.append(lines[i].strip())
                i += 1

            raw_text = " ".join(text_lines)
            cleaned_text, speaker = _clean_caption_text(raw_text)
            if speaker:
                current_speaker = speaker

            if cleaned_text:
                segments.append(
                    TranscriptSegment(
                        start_sec=start_sec,
                        end_sec=end_sec,
                        text=cleaned_text,
                        speaker=current_speaker,
                    )
                )
        else:
            i += 1

    return UnifiedTranscript(recording_id=recording_id, source_format="vtt", segments=segments)


def parse_pdf(file_path: Union[str, Path], recording_id: str = "recording") -> UnifiedTranscript:
    """Parse a lecture transcript PDF using pypdf, extracting timestamped utterances."""
    try:
        from pypdf import PdfReader
    except ImportError:
        raise ImportError("pypdf is required to parse PDF transcripts. Install via `uv add pypdf`.")

    reader = PdfReader(str(file_path))
    full_pages_text: List[str] = []
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            full_pages_text.append(extracted)

    full_text = "\n".join(full_pages_text)

    # Regex for timestamps in transcript text, e.g. [00:01:23] or [01:23] or (00:01:23)
    ts_pattern = re.compile(
        r"(?:\[|\()?(?:(\d{1,2}):)?(\d{2}):(\d{2})(?:[.,](\d{1,3}))?(?:\]|\))?"
    )

    segments: List[TranscriptSegment] = []
    current_speaker: Optional[str] = None

    # Split lines and identify timestamp-marked blocks
    lines = full_text.splitlines()
    raw_blocks: List[tuple[float, str]] = []

    for line in lines:
        line_str = line.strip()
        if not line_str:
            continue

        # Look for timestamp at start or within line
        m = ts_pattern.search(line_str)
        if m and (m.start() == 0 or m.start() < 10):
            h_str, m_str, s_str, ms_str = m.groups()
            h = int(h_str) if h_str else 0
            m_val = int(m_str)
            s_val = int(s_str)
            ms_val = int(ms_str.ljust(3, "0")[:3]) if ms_str else 0
            ts_sec = h * 3600.0 + m_val * 60.0 + s_val + ms_val / 1000.0

            remaining_text = (line_str[:m.start()] + " " + line_str[m.end():]).strip()
            raw_blocks.append((ts_sec, remaining_text))
        elif raw_blocks:
            # Append text to latest block
            prev_ts, prev_txt = raw_blocks[-1]
            raw_blocks[-1] = (prev_ts, prev_txt + " " + line_str)
        else:
            # Preamble before first timestamp
            raw_blocks.append((0.0, line_str))

    # Calculate end timestamps based on next segment
    for idx, (start_sec, raw_txt) in enumerate(raw_blocks):
        cleaned_text, speaker = _clean_caption_text(raw_txt)
        if speaker:
            current_speaker = speaker

        if not cleaned_text:
            continue

        if idx + 1 < len(raw_blocks):
            next_start = raw_blocks[idx + 1][0]
            end_sec = max(start_sec + 1.0, next_start)
        else:
            # Estimate last segment duration by word count (~150 words/min)
            word_count = len(cleaned_text.split())
            end_sec = start_sec + max(2.0, word_count / 2.5)

        segments.append(
            TranscriptSegment(
                start_sec=start_sec,
                end_sec=end_sec,
                text=cleaned_text,
                speaker=current_speaker,
            )
        )

    return UnifiedTranscript(recording_id=recording_id, source_format="pdf", segments=segments)


def parse_micase_xml(content: str, recording_id: str = "micase_lecture") -> UnifiedTranscript:
    """
    Parse a MICASE XML / SGML academic lecture transcript.
    Preserves speaker identifiers (PRF = Professor, S1, S2 = Students) and extracts speech turns.
    """
    # Wrap in root if document is an XML fragment
    xml_str = content.strip()
    if not xml_str.startswith("<?xml") and not xml_str.startswith("<MICASE") and not xml_str.startswith("<ROOT"):
        xml_str = f"<ROOT>{xml_str}</ROOT>"

    try:
        root = ET.fromstring(xml_str)
    except ET.ParseError:
        # Fallback regex parsing if SGML entities or unescaped characters cause XML parse failure
        return _parse_micase_regex_fallback(xml_str, recording_id)

    segments: List[TranscriptSegment] = []
    # Time tracker in seconds
    current_time_sec = 0.0

    # Locate utterance elements: <U WHO="..."> or <u>
    utterances = root.findall(".//U") or root.findall(".//u")
    if not utterances:
        # Check direct children
        utterances = [elem for elem in root.iter() if elem.tag.upper() == "U"]

    for idx, u in enumerate(utterances):
        speaker = u.attrib.get("WHO") or u.attrib.get("who") or "SPEAKER"
        
        # Check for start/end attributes
        start_attr = u.attrib.get("START") or u.attrib.get("start")
        end_attr = u.attrib.get("END") or u.attrib.get("end")

        # Collect text inside element, stripping nested non-text tags
        text_parts = []
        for text_part in u.itertext():
            if text_part:
                text_parts.append(text_part)
        raw_text = " ".join(text_parts)
        cleaned_text, _ = _clean_caption_text(raw_text)

        if not cleaned_text:
            continue

        words = len(cleaned_text.split())
        estimated_duration = max(1.5, words / 2.6)  # ~156 words per minute

        if start_attr:
            try:
                start_sec = float(start_attr)
            except ValueError:
                start_sec = current_time_sec
        else:
            start_sec = current_time_sec

        if end_attr:
            try:
                end_sec = float(end_attr)
            except ValueError:
                end_sec = start_sec + estimated_duration
        else:
            end_sec = start_sec + estimated_duration

        segments.append(
            TranscriptSegment(
                start_sec=start_sec,
                end_sec=end_sec,
                text=cleaned_text,
                speaker=speaker,
            )
        )
        current_time_sec = end_sec

    return UnifiedTranscript(recording_id=recording_id, source_format="micase_xml", segments=segments)


def _parse_micase_regex_fallback(content: str, recording_id: str) -> UnifiedTranscript:
    """Regex fallback for malformed or raw SGML MICASE transcripts."""
    u_pattern = re.compile(r"<U\s+WHO=[\"']?([^\"'>\s]+)[\"']?[^>]*>(.*?)</U>", re.DOTALL | re.IGNORECASE)
    segments: List[TranscriptSegment] = []
    current_time_sec = 0.0

    for match in u_pattern.finditer(content):
        speaker = match.group(1).strip()
        body = match.group(2)
        cleaned_text, _ = _clean_caption_text(body)

        if not cleaned_text:
            continue

        words = len(cleaned_text.split())
        duration = max(1.5, words / 2.6)
        start_sec = current_time_sec
        end_sec = start_sec + duration

        segments.append(
            TranscriptSegment(
                start_sec=start_sec,
                end_sec=end_sec,
                text=cleaned_text,
                speaker=speaker,
            )
        )
        current_time_sec = end_sec

    return UnifiedTranscript(recording_id=recording_id, source_format="micase_xml", segments=segments)


def parse_json(content: str, recording_id: Optional[str] = None) -> UnifiedTranscript:
    """Parse a UnifiedTranscript JSON string."""
    import json
    data = json.loads(content)
    if isinstance(data, dict) and "segments" in data:
        t = UnifiedTranscript.from_dict(data)
        if recording_id is not None:
            t.recording_id = recording_id
        return t
    raise ValueError("Invalid UnifiedTranscript JSON: missing 'segments' key.")


def parse_transcript(file_path: Union[str, Path], recording_id: Optional[str] = None) -> UnifiedTranscript:
    """Auto-detect format by extension and parse into UnifiedTranscript."""
    path = Path(file_path)
    rec_id = recording_id or path.stem
    ext = path.suffix.lower()

    valid_exts = (".srt", ".vtt", ".pdf", ".xml", ".json")
    if ext not in valid_exts:
        raise ValueError(f"Unsupported transcript format '{ext}'. Expected .srt, .vtt, .pdf, .xml, or .json.")

    if not path.exists():
        raise FileNotFoundError(f"Transcript file not found: {path}")

    if ext == ".srt":
        return parse_srt(path.read_text(encoding="utf-8", errors="replace"), rec_id)
    elif ext == ".vtt":
        return parse_vtt(path.read_text(encoding="utf-8", errors="replace"), rec_id)
    elif ext == ".pdf":
        return parse_pdf(path, rec_id)
    elif ext == ".xml":
        return parse_micase_xml(path.read_text(encoding="utf-8", errors="replace"), rec_id)
    elif ext == ".json":
        return parse_json(path.read_text(encoding="utf-8", errors="replace"), recording_id)
    else:
        raise ValueError(f"Unsupported transcript format '{ext}'. Expected .srt, .vtt, .pdf, .xml, or .json.")


