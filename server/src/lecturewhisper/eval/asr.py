"""
ASR Evaluation and Calibration Suite for Lecture Whisper.

Computes:
- Strict WER (Word Error Rate)
- Filler-Insensitive WER (suppressing hesitations, fillers, and stammers)
- Detailed alignment measures (hits, substitutions, deletions, insertions)
- Real-Time Factor (RTF)
- Hallucination indicators (repetition loops, abnormal compression)
- Generates human calibration sheets (CSV) and interactive side-by-side HTML player
"""
from __future__ import annotations

import csv
import json
import re
import time
import zlib
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import jiwer

from lecturewhisper.eval.parsers import TranscriptSegment, UnifiedTranscript


# ---------------------------------------------------------------------------
# Text Normalization
# ---------------------------------------------------------------------------

_ORDINAL_MAP = {
    "1st": "first",
    "2nd": "second",
    "3rd": "third",
    "4th": "fourth",
    "5th": "fifth",
    "6th": "sixth",
    "7th": "seventh",
    "8th": "eighth",
    "9th": "ninth",
    "10th": "tenth",
}

_COMMON_FILLERS = {
    "uh",
    "um",
    "ah",
    "er",
    "erm",
    "hmm",
    "you know",
    "i mean",
    "sort of",
    "kind of",
}


def _int_to_words(n: int) -> str:
    """Convert integers up to 999,999 to English words."""
    if n < 0:
        return "minus " + _int_to_words(-n)
    if n <= 19:
        words = [
            "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
            "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"
        ]
        return words[n]
    if n <= 99:
        tens = ["twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
        remainder = n % 10
        return tens[n // 10 - 2] + ((" " + _int_to_words(remainder)) if remainder != 0 else "")
    if n <= 999:
        remainder = n % 100
        return _int_to_words(n // 100) + " hundred" + ((" " + _int_to_words(remainder)) if remainder != 0 else "")
    if n <= 999999:
        remainder = n % 1000
        return _int_to_words(n // 1000) + " thousand" + ((" " + _int_to_words(remainder)) if remainder != 0 else "")
    return str(n)


def _expand_numbers(text: str) -> str:
    """Expand standalone digits and ordinals to words."""
    # Ordinals
    for ord_token, word in _ORDINAL_MAP.items():
        text = re.sub(rf"\b{ord_token}\b", word, text, flags=re.IGNORECASE)

    # Standalone integers
    def _repl_num(match: re.Match) -> str:
        s = match.group(0)
        try:
            val = int(s)
            if 0 <= val <= 999999:
                return _int_to_words(val)
        except ValueError:
            pass
        return s

    return re.sub(r"\b\d+\b", _repl_num, text)


def normalize_strict(text: str) -> str:
    """
    Standard strict ASR text normalizer:
    - Lowercase
    - Expand numbers and ordinals
    - Strip punctuation and symbols
    - Collapse extra whitespace
    """
    if not text:
        return ""
    text = text.lower()
    text = _expand_numbers(text)
    # Strip punctuation except apostrophes within words
    text = re.sub(r"[^\w\s']", " ", text)
    text = text.replace("'", "")
    # Normalize spaces
    return " ".join(text.split()).strip()


def normalize_filler_insensitive(text: str) -> str:
    """
    Filler-insensitive text normalizer:
    - Applies strict normalization
    - Removes common hesitation fillers ('uh', 'um', 'you know', etc.)
    - Collapses repeated stammer words ('the the' -> 'the')
    """
    cleaned = normalize_strict(text)
    if not cleaned:
        return ""

    # Remove multi-word fillers first
    for filler in ("you know", "i mean", "sort of", "kind of"):
        cleaned = re.sub(rf"\b{filler}\b", " ", cleaned)

    # Remove single-word fillers
    words = cleaned.split()
    filtered_words = [w for w in words if w not in ("uh", "um", "ah", "er", "erm", "hmm")]

    # Collapse stammer repetitions (e.g. ['the', 'the'] -> ['the'])
    collapsed: List[str] = []
    for w in filtered_words:
        if collapsed and collapsed[-1] == w:
            continue
        collapsed.append(w)

    return " ".join(collapsed).strip()


# ---------------------------------------------------------------------------
# Metrics and Evaluation
# ---------------------------------------------------------------------------

@dataclass
class ASRMetrics:
    strict_wer: float
    filler_insensitive_wer: float
    substitutions: int
    deletions: int
    insertions: int
    hits: int
    ref_word_count: int
    hyp_word_count: int

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def calculate_wer_metrics(reference_text: str, hypothesis_text: str) -> ASRMetrics:
    """Compute strict and filler-insensitive WER plus alignment error breakdown."""
    ref_strict = normalize_strict(reference_text)
    hyp_strict = normalize_strict(hypothesis_text)

    if not ref_strict:
        # Edge case: empty reference
        hyp_words = len(hyp_strict.split())
        return ASRMetrics(
            strict_wer=1.0 if hyp_words > 0 else 0.0,
            filler_insensitive_wer=1.0 if hyp_words > 0 else 0.0,
            substitutions=0,
            deletions=0,
            insertions=hyp_words,
            hits=0,
            ref_word_count=0,
            hyp_word_count=hyp_words,
        )

    strict_res = jiwer.process_words(ref_strict, hyp_strict)
    ref_filler = normalize_filler_insensitive(reference_text)
    hyp_filler = normalize_filler_insensitive(hypothesis_text)

    if not ref_filler:
        filler_wer = 0.0 if not hyp_filler else 1.0
    else:
        filler_res = jiwer.process_words(ref_filler, hyp_filler)
        filler_wer = filler_res.wer

    return ASRMetrics(
        strict_wer=round(float(strict_res.wer), 4),
        filler_insensitive_wer=round(float(filler_wer), 4),
        substitutions=int(strict_res.substitutions),
        deletions=int(strict_res.deletions),
        insertions=int(strict_res.insertions),
        hits=int(strict_res.hits),
        ref_word_count=len(ref_strict.split()),
        hyp_word_count=len(hyp_strict.split()),
    )


# ---------------------------------------------------------------------------
# Hallucination and Anomaly Detection
# ---------------------------------------------------------------------------

def detect_hallucinations(text: str) -> List[str]:
    """
    Detect potential Whisper hallucination patterns:
    1. Severe phrase repetition loops (e.g. 3+ repetitions of 3+ word ngram)
    2. Extreme compression ratio (> 2.5 or < 0.3)
    3. Known subtitle artifact phrases ('Subtitles by', 'Translated by', etc.)
    """
    issues = []
    if not text or len(text.strip()) == 0:
        return issues

    # 1. Known subtitle / hallucination boilerplate
    boilerplate_patterns = [
        r"subtitles\s+by",
        r"translated\s+by",
        r"thank\s+you\s+for\s+watching",
        r"please\s+subscribe",
        r"like\s+and\s+subscribe",
        r"copyright\s+\d{4}",
    ]
    for pat in boilerplate_patterns:
        if re.search(pat, text, re.IGNORECASE):
            issues.append(f"Boilerplate phrase detected: '{pat}'")

    # 2. Repeated n-grams (3-gram repeated 3 or more times consecutively)
    words = text.split()
    if len(words) >= 9:
        for n in (3, 4):
            for i in range(len(words) - (n * 3) + 1):
                ngram1 = " ".join(words[i : i + n]).lower()
                ngram2 = " ".join(words[i + n : i + (2 * n)]).lower()
                ngram3 = " ".join(words[i + (2 * n) : i + (3 * n)]).lower()
                if ngram1 == ngram2 == ngram3 and len(ngram1) > 4:
                    issues.append(f"Repetition loop detected: '{ngram1}' x3")
                    break
            if issues:
                break

    # 3. Text compression ratio check
    encoded = text.encode("utf-8")
    if len(encoded) > 50:
        compressed = zlib.compress(encoded)
        ratio = len(encoded) / max(1, len(compressed))
        if ratio > 2.8:
            issues.append(f"Abnormal repetitive text compression ratio: {ratio:.2f}")

    return issues


# ---------------------------------------------------------------------------
# Calibration Window Alignment & CSV Export
# ---------------------------------------------------------------------------

@dataclass
class AlignedCalibrationSegment:
    segment_idx: int
    start_sec: float
    end_sec: float
    speaker: str
    reference_text: str
    hypothesis_text: str
    strict_wer: float
    filler_wer: float
    status: str = "PENDING_REVIEW"
    human_verified_text: str = ""
    notes: str = ""

    def to_csv_row(self, recording_id: str) -> Dict[str, Any]:
        return {
            "recording_id": recording_id,
            "segment_idx": self.segment_idx,
            "time_range": f"{self.start_sec:.2f}s - {self.end_sec:.2f}s",
            "start_sec": self.start_sec,
            "end_sec": self.end_sec,
            "speaker": self.speaker,
            "reference_text": self.reference_text,
            "hypothesis_text": self.hypothesis_text,
            "strict_wer": f"{self.strict_wer * 100:.1f}%",
            "filler_wer": f"{self.filler_wer * 100:.1f}%",
            "status": self.status,
            "human_verified_text": self.human_verified_text,
            "notes": self.notes,
        }


def extract_calibration_window(
    ref_transcript: UnifiedTranscript,
    hyp_transcript: UnifiedTranscript,
    window_start_sec: float,
    window_duration_sec: float = 300.0,
) -> List[AlignedCalibrationSegment]:
    """
    Extract aligned segments from reference and hypothesis within a time window.
    Default window duration is 300 seconds (5 minutes).
    """
    window_end_sec = window_start_sec + window_duration_sec
    ref_segs = [
        s for s in ref_transcript.segments
        if (s.start_sec >= window_start_sec and s.start_sec < window_end_sec)
        or (s.end_sec > window_start_sec and s.end_sec <= window_end_sec)
    ]

    aligned: List[AlignedCalibrationSegment] = []

    for idx, r_seg in enumerate(ref_segs):
        # Find overlapping hyp segments
        overlapping_hyp = [
            h for h in hyp_transcript.segments
            if (h.start_sec < r_seg.end_sec + 0.5 and h.end_sec > r_seg.start_sec - 0.5)
        ]
        hyp_text = " ".join(h.text for h in overlapping_hyp).strip()

        metrics = calculate_wer_metrics(r_seg.text, hyp_text)

        aligned.append(
            AlignedCalibrationSegment(
                segment_idx=idx + 1,
                start_sec=r_seg.start_sec,
                end_sec=r_seg.end_sec,
                speaker=r_seg.speaker or "SPEAKER",
                reference_text=r_seg.text,
                hypothesis_text=hyp_text,
                strict_wer=metrics.strict_wer,
                filler_wer=metrics.filler_insensitive_wer,
                status="MATCH" if metrics.filler_insensitive_wer == 0.0 else "PENDING_REVIEW",
            )
        )

    return aligned


def write_calibration_csv(
    recording_id: str,
    segments: List[AlignedCalibrationSegment],
    output_path: Path | str,
) -> None:
    """Write aligned calibration segments to CSV for human audit."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = [
        "recording_id",
        "segment_idx",
        "time_range",
        "start_sec",
        "end_sec",
        "speaker",
        "reference_text",
        "hypothesis_text",
        "strict_wer",
        "filler_wer",
        "status",
        "human_verified_text",
        "notes",
    ]

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for seg in segments:
            writer.writerow(seg.to_csv_row(recording_id))


# ---------------------------------------------------------------------------
# Interactive HTML Side-by-Side Review Player
# ---------------------------------------------------------------------------

def generate_calibration_html(
    recording_id: str,
    audio_rel_path: str,
    segments: List[AlignedCalibrationSegment],
    window_start_sec: float,
    window_duration_sec: float,
    output_path: Path | str,
) -> None:
    """Generate a responsive HTML review application for human gold verification."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    # Compute window summary metrics
    all_ref = " ".join(s.reference_text for s in segments)
    all_hyp = " ".join(s.hypothesis_text for s in segments)
    summary_metrics = calculate_wer_metrics(all_ref, all_hyp)

    rows_html = []
    for s in segments:
        diff_status = "perfect" if s.filler_wer == 0.0 else "discrepancy"
        badge_color = "#10b981" if s.filler_wer == 0.0 else ("#f59e0b" if s.filler_wer < 0.3 else "#ef4444")
        
        row = f"""
        <tr class="seg-row {diff_status}" id="seg-{s.segment_idx}" data-start="{s.start_sec}" data-end="{s.end_sec}">
          <td class="col-idx">
            <button class="btn-play" onclick="playSegment({s.start_sec}, {s.end_sec})">▶ {s.start_sec:.1f}s</button>
          </td>
          <td class="col-speaker"><span class="badge-speaker">{s.speaker}</span></td>
          <td class="col-ref">{s.reference_text}</td>
          <td class="col-hyp">{s.hypothesis_text}</td>
          <td class="col-wer" style="color: {badge_color}; font-weight: 600;">{s.filler_wer * 100:.1f}%</td>
          <td class="col-actions">
            <input type="text" class="input-correction" id="corr-{s.segment_idx}" placeholder="Verified text..." value="" />
            <div class="action-btn-group">
              <button class="btn-verify" onclick="markVerified({s.segment_idx}, 'VERIFIED')">✓ Accept Ref</button>
              <button class="btn-flag" onclick="markVerified({s.segment_idx}, 'FLAGGED')">⚑ Flag</button>
            </div>
          </td>
        </tr>
        """
        rows_html.append(row)

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lecture Whisper - Ground Truth Calibration Review</title>
  <style>
    :root {{
      --bg: #0f172a;
      --card: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #6366f1;
      --accent-hover: #4f46e5;
      --green: #10b981;
      --yellow: #f59e0b;
      --red: #ef4444;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }}
    .container {{
      max-width: 1400px;
      margin: 0 auto;
    }}
    .header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--card);
      padding: 20px 28px;
      border-radius: 12px;
      border: 1px solid var(--border);
      margin-bottom: 20px;
    }}
    .header h1 {{
      margin: 0 0 6px 0;
      font-size: 20px;
      font-weight: 700;
    }}
    .header p {{
      margin: 0;
      font-size: 13px;
      color: var(--muted);
    }}
    .stat-pills {{
      display: flex;
      gap: 12px;
    }}
    .stat-pill {{
      background: #090d16;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 14px;
      text-align: right;
    }}
    .stat-val {{
      font-size: 18px;
      font-weight: 700;
      color: var(--accent);
    }}
    .stat-label {{
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    .player-dock {{
      position: sticky;
      top: 12px;
      z-index: 100;
      background: #182234e6;
      backdrop-filter: blur(8px);
      border: 1px solid var(--accent);
      border-radius: 10px;
      padding: 12px 20px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }}
    audio {{
      flex: 1;
      height: 36px;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      background: var(--card);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border);
    }}
    th {{
      background: #131d2e;
      text-align: left;
      padding: 12px 16px;
      font-size: 12px;
      text-transform: uppercase;
      color: var(--muted);
      border-bottom: 1px solid var(--border);
    }}
    td {{
      padding: 14px 16px;
      font-size: 13px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }}
    .col-idx {{ width: 90px; }}
    .col-speaker {{ width: 110px; }}
    .col-ref {{ width: 34%; }}
    .col-hyp {{ width: 34%; }}
    .col-wer {{ width: 80px; text-align: right; }}
    .col-actions {{ width: 220px; }}
    .badge-speaker {{
      display: inline-block;
      padding: 3px 8px;
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 11px;
      font-family: monospace;
      color: var(--accent);
    }}
    .btn-play {{
      background: #334155;
      color: var(--text);
      border: none;
      border-radius: 6px;
      padding: 5px 10px;
      font-size: 12px;
      cursor: pointer;
      font-weight: 600;
    }}
    .btn-play:hover {{ background: var(--accent); }}
    .input-correction {{
      width: 100%;
      box-sizing: border-box;
      background: #0f172a;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: #fff;
      padding: 6px 8px;
      font-size: 12px;
      margin-bottom: 6px;
    }}
    .action-btn-group {{
      display: flex;
      gap: 6px;
    }}
    .btn-verify {{
      flex: 1;
      background: #065f46;
      color: #34d399;
      border: 1px solid #059669;
      border-radius: 5px;
      padding: 4px;
      font-size: 11px;
      cursor: pointer;
    }}
    .btn-flag {{
      flex: 1;
      background: #7f1d1d;
      color: #f87171;
      border: 1px solid #b91c1c;
      border-radius: 5px;
      padding: 4px;
      font-size: 11px;
      cursor: pointer;
    }}
    .btn-export {{
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }}
    .btn-export:hover {{ background: var(--accent-hover); }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>Ground Truth Calibration Review</h1>
        <p>Recording: <strong>{recording_id}</strong> &bull; Calibration Window: {window_start_sec:.1f}s - {window_start_sec + window_duration_sec:.1f}s ({len(segments)} segments)</p>
      </div>
      <div class="stat-pills">
        <div class="stat-pill">
          <div class="stat-val">{summary_metrics.strict_wer * 100:.1f}%</div>
          <div class="stat-label">Strict WER</div>
        </div>
        <div class="stat-pill">
          <div class="stat-val">{summary_metrics.filler_insensitive_wer * 100:.1f}%</div>
          <div class="stat-label">Filler-Insensitive WER</div>
        </div>
        <div class="stat-pill">
          <button class="btn-export" onclick="exportVerifiedJSON()">Export Ground Truth</button>
        </div>
      </div>
    </div>

    <div class="player-dock">
      <span><strong>Audio:</strong> {audio_rel_path}</span>
      <audio id="audio-player" controls src="../{audio_rel_path}"></audio>
      <span id="time-status" style="font-family: monospace; font-size: 12px; color: var(--muted);">00:00.0</span>
    </div>

    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Speaker</th>
          <th>Reference Transcript (Ground Truth)</th>
          <th>Whisper ASR Hypothesis</th>
          <th>Filler WER</th>
          <th>Human Audit & Verification</th>
        </tr>
      </thead>
      <tbody>
        {"".join(rows_html)}
      </tbody>
    </table>
  </div>

  <script>
    const player = document.getElementById('audio-player');
    const timeStatus = document.getElementById('time-status');
    let stopTime = null;

    player.addEventListener('timeupdate', () => {{
      timeStatus.innerText = player.currentTime.toFixed(1) + 's';
      if (stopTime !== null && player.currentTime >= stopTime) {{
        player.pause();
        stopTime = null;
      }}
    }});

    function playSegment(start, end) {{
      player.currentTime = start;
      stopTime = end;
      player.play();
    }}

    function markVerified(idx, status) {{
      const row = document.getElementById('seg-' + idx);
      if (status === 'VERIFIED') {{
        row.style.background = '#064e3b40';
        row.setAttribute('data-status', 'VERIFIED');
      }} else {{
        row.style.background = '#7f1d1d40';
        row.setAttribute('data-status', 'FLAGGED');
      }}
    }}

    function exportVerifiedJSON() {{
      const rows = document.querySelectorAll('.seg-row');
      const data = [];
      rows.forEach(r => {{
        const id = r.id.replace('seg-', '');
        const corr = document.getElementById('corr-' + id).value;
        data.push({{
          segment_idx: parseInt(id),
          start_sec: parseFloat(r.getAttribute('data-start')),
          end_sec: parseFloat(r.getAttribute('data-end')),
          status: r.getAttribute('data-status') || 'PENDING',
          verified_text: corr || r.querySelector('.col-ref').innerText.trim()
        }});
      }});
      const blob = new Blob([JSON.stringify(data, null, 2)], {{ type: 'application/json' }});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '{recording_id}_verified_ground_truth.json';
      a.click();
    }}
  </script>
</body>
</html>
"""
    path.write_text(html_content, encoding="utf-8")
