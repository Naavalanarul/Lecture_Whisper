import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Copy,
  Download,
  Share2,
  Check,
  Sparkles,
  Bookmark,
  Code2,
  Edit2,
  HelpCircle,
  Clock,
  Printer,
  ChevronRight,
  User,
  Quote,
} from 'lucide-react';
import { Transcript, Notes, ChapterNotes, TranscriptSegment } from '../types';
import { formatTime, copyToClipboard, downloadMarkdown } from '../utils/formatters';

interface LectureViewProps {
  transcript: Transcript;
  notes: Notes;
  currentTime: number;
  onSeek: (time: number) => void;
  followTranscript: boolean;
  onAddCorrection?: (originalText: string, correctedText: string) => void;
  subjectTitle?: string;
}

export const LectureView: React.FC<LectureViewProps> = ({
  transcript,
  notes,
  currentTime,
  onSeek,
  followTranscript,
  onAddCorrection,
  subjectTitle = 'CS 106B — Dynamic Programming & Memoization',
}) => {
  const [selectedChapterIdx, setSelectedChapterIdx] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedNotes, setCopiedNotes] = useState<boolean>(false);
  const [editingSegmentIdx, setEditingSegmentIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>('');
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const activeSegmentRef = useRef<HTMLDivElement | null>(null);

  const chapters = notes.chapters || [];
  const selectedChapter = chapters[selectedChapterIdx] || chapters[0];

  // Detect active segment based on currentTime
  const activeSegmentIdx = transcript.segments.findIndex(
    (s) => currentTime >= s.start && currentTime <= s.end
  );

  // Auto-scroll transcript when following audio
  useEffect(() => {
    if (followTranscript && activeSegmentRef.current && transcriptContainerRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeSegmentIdx, followTranscript]);

  const handleCopyNotes = async () => {
    const ok = await copyToClipboard(notes.overall_summary);
    if (ok) {
      setCopiedNotes(true);
      setTimeout(() => setCopiedNotes(false), 2000);
    }
  };

  const handleSaveCorrection = (segmentIdx: number) => {
    if (onAddCorrection && editText.trim()) {
      const original = transcript.segments[segmentIdx].text;
      onAddCorrection(original, editText);
    }
    setEditingSegmentIdx(null);
  };

  const filteredSegments = transcript.segments.filter((seg) =>
    seg.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN: Synchronized Transcript (7 Cols) */}
      <div className="lg:col-span-7 space-y-4">
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-5 h-5 text-brand-400 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-white truncate">{subjectTitle}</h3>
              <p className="text-[11px] text-slate-400">
                ASR Model: <span className="font-mono text-slate-300">{transcript.asr_model}</span>
              </p>
            </div>
          </div>

          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search transcript..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-950 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Transcript Segments List */}
        <div
          ref={transcriptContainerRef}
          className="glass-card rounded-2xl border border-white/10 p-4 space-y-3 max-h-[640px] overflow-y-auto"
        >
          {filteredSegments.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No matching transcript segments found for "{searchQuery}".
            </div>
          ) : (
            filteredSegments.map((seg, idx) => {
              const isActive = idx === activeSegmentIdx;
              const isLecturer = seg.speaker.includes('TURING') || seg.speaker.includes('PROF');
              const isEditing = editingSegmentIdx === idx;

              return (
                <div
                  key={idx}
                  ref={isActive ? activeSegmentRef : null}
                  onClick={() => onSeek(seg.start)}
                  className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer relative group ${
                    isActive
                      ? 'bg-brand-500/10 border-brand-500/50 shadow-md shadow-brand-500/10 ring-1 ring-brand-500/30'
                      : 'bg-surface-950/60 border-white/5 hover:border-white/20 hover:bg-surface-950'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isLecturer
                            ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {isLecturer ? 'L' : 'S'}
                      </span>
                      <span className="text-xs font-semibold text-slate-300">
                        {isLecturer ? 'Prof. Alan Turing' : 'Student Question'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                        {formatTime(seg.start)} - {formatTime(seg.end)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSegmentIdx(idx);
                          setEditText(seg.text);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-opacity"
                        title="Submit ASR correction"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 p-2 bg-surface-900 rounded-lg border border-brand-500/40"
                    >
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-surface-950 text-xs text-white p-2 rounded border border-white/10 focus:outline-none"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => setEditingSegmentIdx(null)}
                          className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveCorrection(idx)}
                          className="px-3 py-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded"
                        >
                          Save Correction
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={`text-xs sm:text-sm leading-relaxed ${
                        isActive ? 'text-white font-medium' : 'text-slate-300'
                      }`}
                    >
                      {seg.text}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Chapter Notes & Synthesis Deck (5 Cols) */}
      <div className="lg:col-span-5 space-y-4">
        {/* Action toolbar */}
        <div className="glass-card rounded-2xl p-4 border border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">AI Study Notes</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyNotes}
              className="px-2.5 py-1.5 rounded-lg bg-surface-950 hover:bg-surface-850 text-slate-300 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Copy overall summary"
            >
              {copiedNotes ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedNotes ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={() => downloadMarkdown(notes, subjectTitle)}
              className="px-2.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Download formatted markdown notes"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .md</span>
            </button>
          </div>
        </div>

        {/* Chapter Tabs */}
        {chapters.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {chapters.map((ch, idx) => {
              const isSelected = selectedChapterIdx === idx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedChapterIdx(idx);
                    onSeek(ch.start);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 flex items-center gap-1.5 border transition-all ${
                    isSelected
                      ? 'bg-brand-600 border-brand-500 text-white font-semibold shadow-md shadow-brand-600/20'
                      : 'bg-surface-900 border-white/5 text-slate-400 hover:text-white hover:bg-surface-850'
                  }`}
                >
                  <Bookmark className="w-3 h-3" />
                  <span>{ch.title}</span>
                  <span className="text-[10px] opacity-70 font-mono">({formatTime(ch.start)})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Selected Chapter Content */}
        {selectedChapter && (
          <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-5 max-h-[580px] overflow-y-auto">
            {/* Chapter Header */}
            <div>
              <div className="flex items-center gap-2 text-xs text-brand-400 font-semibold mb-1">
                <span>CHAPTER {selectedChapterIdx + 1}</span>
                <span>•</span>
                <span className="font-mono">
                  {formatTime(selectedChapter.start)} - {formatTime(selectedChapter.end)}
                </span>
              </div>
              <h4 className="text-base font-bold text-white">{selectedChapter.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed mt-2 p-3 bg-surface-950/80 rounded-xl border border-white/5">
                {selectedChapter.summary}
              </p>
            </div>

            {/* Key Takeaways */}
            {selectedChapter.key_points && selectedChapter.key_points.length > 0 && (
              <div>
                <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Key Points & Takeaways</span>
                </h5>
                <ul className="space-y-1.5">
                  {selectedChapter.key_points.map((pt, i) => (
                    <li
                      key={i}
                      className="text-xs text-slate-300 bg-surface-950/50 p-2.5 rounded-xl border border-white/5 flex items-start gap-2 leading-relaxed"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0 mt-1.5" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Definitions */}
            {selectedChapter.definitions && selectedChapter.definitions.length > 0 && (
              <div>
                <h5 className="text-xs font-bold text-cyan-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Quote className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Core Definitions</span>
                </h5>
                <div className="space-y-2">
                  {selectedChapter.definitions.map((def, i) => (
                    <div
                      key={i}
                      className="text-xs text-cyan-100 bg-cyan-950/30 border border-cyan-500/20 p-3 rounded-xl leading-relaxed"
                    >
                      {def}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulas & Code Snippets */}
            {selectedChapter.formulas && selectedChapter.formulas.length > 0 && (
              <div>
                <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Formulas & Algorithmic Recurrences</span>
                </h5>
                <div className="space-y-2 font-mono">
                  {selectedChapter.formulas.map((f, i) => (
                    <div
                      key={i}
                      className="text-xs text-indigo-200 bg-surface-950 p-3 rounded-xl border border-indigo-500/20 overflow-x-auto"
                    >
                      <code>{f}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall Summary Accordion */}
            <div className="pt-3 border-t border-white/5">
              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Executive Lecture Summary
              </h5>
              <p className="text-xs text-slate-400 leading-relaxed italic bg-surface-950/40 p-3 rounded-xl border border-white/5">
                {notes.overall_summary}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
