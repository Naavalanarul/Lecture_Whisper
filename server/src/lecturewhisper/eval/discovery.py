"""
Announcement, Event, and Question Discovery Engine for Lecture Whisper.

Features:
- Configurable cue lexicons (assignments, exams, office hours, schedule changes)
- Window scoring (+/- 20s) for co-occurrences of cues and temporal/calendar expressions
- Question detection using dialogue markers (speaker role) and pedagogical patterns
- Generates review/candidates.csv and interactive review/announcements_review.html
- Human-in-the-loop verification gate: never fabricates results, strictly counts human-verified rows
"""
from __future__ import annotations

import csv
import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from lecturewhisper.eval.parsers import TranscriptSegment, UnifiedTranscript


DEFAULT_CUES = {
    "assignment": [
        "problem set", "psets", "pset", "homework", "hw", "due", "submit",
        "submission", "assignment", "lab report", "project due", "turn in", "deadline"
    ],
    "exam": [
        "midterm", "final exam", "quiz", "test", "examination", "in class exam"
    ],
    "office_hours": [
        "office hours", "recitation", "review session", "help session", "tutorial"
    ],
    "schedule": [
        "no class", "no lecture", "class is canceled", "canceled", "cancelled",
        "holiday", "rescheduled", "makeup lecture", "fall break", "spring break"
    ],
}

_DAY_PATTERNS = r"\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b"
_RELATIVE_TIME_PATTERNS = r"\b(?:tomorrow|next\s+week|tonight|midnight|by\s+5\s*(?:pm|am)?|end\s+of\s+the\s+week)\b"
_MONTH_PATTERNS = r"\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?\b"
_DATE_RE = re.compile(f"{_DAY_PATTERNS}|{_RELATIVE_TIME_PATTERNS}|{_MONTH_PATTERNS}", re.IGNORECASE)

_QUESTION_STARTERS = re.compile(
    r"^(?:why|how|what|when|where|who|is\s+there|can\s+(?:we|you|i)|could\s+you|does\s+(?:that|it|this)|are\s+we)\b",
    re.IGNORECASE,
)
_PEDAGOGICAL_PROMPTS = re.compile(
    r"\b(?:any\s+questions|does\s+everyone\s+understand|who\s+can\s+tell\s+me|does\s+that\s+make\s+sense)\b",
    re.IGNORECASE,
)


@dataclass
class CandidateItem:
    item_id: str
    kind: str  # "announcement" or "question"
    category: str  # "assignment", "exam", "office_hours", "schedule", "student_question", "instructor_prompt"
    recording_id: str
    start_sec: float
    end_sec: float
    speaker: str
    text: str
    matched_cue: str
    detected_date: Optional[str]
    score: float
    context_window: str
    status: str = "PENDING_REVIEW"
    human_verified: bool = False
    reviewer_notes: str = ""

    def to_csv_row(self) -> Dict[str, Any]:
        return {
            "id": self.item_id,
            "kind": self.kind,
            "category": self.category,
            "recording_id": self.recording_id,
            "timecode": f"{self.start_sec:.2f}s - {self.end_sec:.2f}s",
            "start_sec": self.start_sec,
            "end_sec": self.end_sec,
            "speaker": self.speaker,
            "text": self.text,
            "matched_cue": self.matched_cue,
            "detected_date": self.detected_date or "",
            "score": round(self.score, 3),
            "status": self.status,
            "human_verified": "TRUE" if self.human_verified else "FALSE",
            "context_window": self.context_window,
            "reviewer_notes": self.reviewer_notes,
        }


def _find_date_in_window(
    segments: List[TranscriptSegment],
    center_idx: int,
    window_sec: float = 20.0,
) -> Tuple[Optional[str], float]:
    """
    Search for temporal expressions in +/- window_sec around center segment.
    Returns (detected_date_str, distance_penalty_multiplier).
    """
    center_seg = segments[center_idx]
    center_time = (center_seg.start_sec + center_seg.end_sec) / 2.0

    best_match: Optional[str] = None
    min_dist = float("inf")

    # Look backwards and forwards
    for i, seg in enumerate(segments):
        seg_time = (seg.start_sec + seg.end_sec) / 2.0
        dist = abs(seg_time - center_time)
        if dist > window_sec:
            continue

        match = _DATE_RE.search(seg.text)
        if match and dist < min_dist:
            min_dist = dist
            best_match = match.group(0)

    if best_match:
        # Distance score multiplier: 1.0 at 0s distance down to 0.7 at 20s
        mult = max(0.7, 1.0 - (min_dist / window_sec) * 0.3)
        return best_match, mult

    return None, 0.0


def _build_context_window(
    segments: List[TranscriptSegment],
    center_idx: int,
    window_sec: float = 20.0,
) -> str:
    """Build text context within +/- window_sec for human review."""
    center_time = (segments[center_idx].start_sec + segments[center_idx].end_sec) / 2.0
    context_parts = []
    for s in segments:
        s_time = (s.start_sec + s.end_sec) / 2.0
        if abs(s_time - center_time) <= window_sec:
            prefix = f"[{s.speaker or 'SPEAKER'} {s.start_sec:.1f}s]: "
            context_parts.append(prefix + s.text)
    return " \n".join(context_parts)


def discover_announcements_and_events(
    transcript: UnifiedTranscript,
    cues: Optional[Dict[str, List[str]]] = None,
    window_sec: float = 20.0,
) -> List[CandidateItem]:
    """Scan transcript for potential course announcements, deadlines, and questions."""
    cues_dict = cues or DEFAULT_CUES
    segments = transcript.segments
    candidates: List[CandidateItem] = []
    item_counter = 1

    for idx, seg in enumerate(segments):
        seg_lower = seg.text.lower()
        speaker = seg.speaker or "SPEAKER"

        # 1. Scan for announcement and schedule cues
        for category, keywords in cues_dict.items():
            matched_kws = [kw for kw in keywords if re.search(rf"\b{re.escape(kw)}\b", seg_lower)]
            if matched_kws:
                cue = matched_kws[0]
                base_score = 0.65
                # Check for temporal expressions within +/- window_sec
                date_expr, date_mult = _find_date_in_window(segments, idx, window_sec=window_sec)
                final_score = (base_score + 0.30 * date_mult) if date_expr else base_score

                # Priority boost if instructor is speaking
                if any(p in speaker.upper() for p in ("PROF", "INSTRUCTOR", "DR.", "TEACHER", "PRF")):
                    final_score = min(1.0, final_score + 0.05)

                context = _build_context_window(segments, idx, window_sec=window_sec)

                candidates.append(
                    CandidateItem(
                        item_id=f"ANN-{transcript.recording_id[:8]}-{item_counter:03d}",
                        kind="announcement",
                        category=category,
                        recording_id=transcript.recording_id,
                        start_sec=seg.start_sec,
                        end_sec=seg.end_sec,
                        speaker=speaker,
                        text=seg.text,
                        matched_cue=cue,
                        detected_date=date_expr,
                        score=final_score,
                        context_window=context,
                    )
                )
                item_counter += 1
                break  # Don't duplicate per segment across categories

        # 2. Scan for questions
        is_question = False
        q_type = "student_question"
        q_score = 0.5

        # Check dialogue markers (non-lecturer speaker turns)
        is_student_speaker = any(s in speaker.upper() for s in ("STUDENT", "S1", "S2", "S3", "SU", "AUDIENCE"))
        if is_student_speaker:
            is_question = True
            q_score += 0.25

        if "?" in seg.text:
            is_question = True
            q_score += 0.20

        if _QUESTION_STARTERS.search(seg.text.strip()):
            is_question = True
            q_score += 0.15

        if _PEDAGOGICAL_PROMPTS.search(seg.text):
            is_question = True
            q_type = "instructor_prompt"
            q_score = max(q_score, 0.75)

        if is_question and q_score >= 0.60:
            context = _build_context_window(segments, idx, window_sec=window_sec)
            candidates.append(
                CandidateItem(
                    item_id=f"QST-{transcript.recording_id[:8]}-{item_counter:03d}",
                    kind="question",
                    category=q_type,
                    recording_id=transcript.recording_id,
                    start_sec=seg.start_sec,
                    end_sec=seg.end_sec,
                    speaker=speaker,
                    text=seg.text,
                    matched_cue="dialogue_marker" if is_student_speaker else "syntax_marker",
                    detected_date=None,
                    score=min(1.0, q_score),
                    context_window=context,
                )
            )
            item_counter += 1

    # Sort candidates by score descending
    candidates.sort(key=lambda c: c.score, reverse=True)
    return candidates


def write_candidates_csv(
    candidates: List[CandidateItem],
    output_path: Path | str,
) -> None:
    """Write candidate events and questions to CSV."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = [
        "id", "kind", "category", "recording_id", "timecode",
        "start_sec", "end_sec", "speaker", "text", "matched_cue",
        "detected_date", "score", "status", "human_verified",
        "context_window", "reviewer_notes",
    ]

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for cand in candidates:
            writer.writerow(cand.to_csv_row())


def generate_announcements_review_html(
    candidates: List[CandidateItem],
    output_path: Path | str,
) -> None:
    """Generate human review HTML interface for announcement and question candidates."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    rows_html = []
    for c in candidates:
        badge_bg = "#3b82f6" if c.kind == "announcement" else "#8b5cf6"
        score_pct = int(c.score * 100)
        
        row = f"""
        <tr class="cand-row" id="row-{c.item_id}" data-id="{c.item_id}">
          <td><strong>{c.item_id}</strong></td>
          <td><span class="badge" style="background: {badge_bg};">{c.category}</span></td>
          <td>{c.recording_id}</td>
          <td>{c.start_sec:.1f}s - {c.end_sec:.1f}s</td>
          <td><span class="badge-speaker">{c.speaker}</span></td>
          <td class="col-text">{c.text}</td>
          <td><span class="badge-cue">{c.matched_cue}</span></td>
          <td><strong>{c.detected_date or '—'}</strong></td>
          <td>{score_pct}%</td>
          <td>
            <div class="btn-group">
              <button class="btn-yes" onclick="setDecision('{c.item_id}', 'VERIFIED')">✓ Yes</button>
              <button class="btn-no" onclick="setDecision('{c.item_id}', 'REJECTED')">✗ No</button>
            </div>
            <input type="text" class="notes-input" id="note-{c.item_id}" placeholder="Human notes / date..." />
          </td>
        </tr>
        """
        rows_html.append(row)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Lecture Whisper - Announcements & Questions Review</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      padding: 24px;
      margin: 0;
    }}
    .container {{
      max-width: 1440px;
      margin: 0 auto;
    }}
    .header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      padding: 20px 28px;
      border-radius: 12px;
      margin-bottom: 20px;
      border: 1px solid #334155;
    }}
    h1 {{ margin: 0 0 6px 0; font-size: 20px; }}
    p {{ margin: 0; font-size: 13px; color: #94a3b8; }}
    table {{
      width: 100%;
      border-collapse: collapse;
      background: #1e293b;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #334155;
    }}
    th {{
      background: #131d2e;
      text-align: left;
      padding: 12px 14px;
      font-size: 12px;
      text-transform: uppercase;
      color: #94a3b8;
      border-bottom: 1px solid #334155;
    }}
    td {{
      padding: 12px 14px;
      font-size: 13px;
      border-bottom: 1px solid #334155;
      vertical-align: top;
    }}
    .badge {{
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      color: #fff;
    }}
    .badge-speaker {{
      display: inline-block;
      padding: 2px 6px;
      background: #090d16;
      border-radius: 4px;
      font-size: 11px;
      font-family: monospace;
      color: #38bdf8;
    }}
    .badge-cue {{
      display: inline-block;
      padding: 2px 6px;
      background: #334155;
      border-radius: 4px;
      font-size: 11px;
      color: #facc15;
    }}
    .col-text {{ max-width: 320px; }}
    .btn-group {{ display: flex; gap: 6px; margin-bottom: 6px; }}
    .btn-yes {{
      background: #059669;
      color: #fff;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    }}
    .btn-no {{
      background: #dc2626;
      color: #fff;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    }}
    .notes-input {{
      width: 100%;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 4px;
      color: #fff;
      padding: 4px;
      font-size: 11px;
      box-sizing: border-box;
    }}
    .btn-export {{
      background: #6366f1;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>Announcement, Event & Question Discovery Review</h1>
        <p>Found <strong>{len(candidates)}</strong> candidate events and questions. Strictly human-verified items become ground truth.</p>
      </div>
      <div>
        <button class="btn-export" onclick="exportVerifiedCSV()">Export Verified CSV</button>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Category</th>
          <th>Recording</th>
          <th>Timecode</th>
          <th>Speaker</th>
          <th>Utterance</th>
          <th>Matched Cue</th>
          <th>Calendar Anchor</th>
          <th>Score</th>
          <th>Human Audit</th>
        </tr>
      </thead>
      <tbody>
        {"".join(rows_html)}
      </tbody>
    </table>
  </div>

  <script>
    function setDecision(id, decision) {{
      const row = document.getElementById('row-' + id);
      if (decision === 'VERIFIED') {{
        row.style.background = '#064e3b40';
        row.setAttribute('data-status', 'VERIFIED');
      }} else {{
        row.style.background = '#7f1d1d40';
        row.setAttribute('data-status', 'REJECTED');
      }}
    }}

    function exportVerifiedCSV() {{
      const rows = document.querySelectorAll('.cand-row');
      const lines = ["id,status,notes"];
      rows.forEach(r => {{
        const id = r.getAttribute('data-id');
        const st = r.getAttribute('data-status') || 'PENDING';
        const note = document.getElementById('note-' + id).value;
        lines.push(`"${{id}}","${{st}}","${{note.replace(/"/g, '""')}}"`);
      }});
      const blob = new Blob([lines.join('\\n')], {{ type: 'text/csv' }});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'verified_candidates.csv';
      a.click();
    }}
  </script>
</body>
</html>
"""
    path.write_text(html, encoding="utf-8")
