import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Copy,
  Download,
  Check,
  Code2,
  Edit2,
  Clock,
  Printer,
  ChevronRight,
  ChevronDown,
  User,
  Quote,
  List,
  Sparkles,
  Volume2,
  Sliders,
  FileText,
  Bookmark,
  Share2,
  Tag,
} from 'lucide-react';
import { Transcript, Notes, ChapterNotes, TranscriptSegment, Word } from '../types';
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

const ESTIMATED_ITEM_HEIGHT = 88; // Approximate height in pixels for virtual row calculation
const OVERSCAN = 6; // Number of items to render above/below viewport

export const LectureView: React.FC<LectureViewProps> = ({
  transcript,
  notes,
  currentTime,
  onSeek,
  followTranscript,
  onAddCorrection,
  subjectTitle = 'Lecture Session',
}) => {
  const [activeMobilePane, setActiveMobilePane] = useState<'transcript' | 'notes' | 'chapters'>('transcript');
  const [selectedChapterIdx, setSelectedChapterIdx] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedNotes, setCopiedNotes] = useState<boolean>(false);
  const [editingSegmentIdx, setEditingSegmentIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>('');

  // Pane width states for desktop resizability (percentages)
  const [leftWidth, setLeftWidth] = useState<number>(20); // Chapters (20%)
  const [rightWidth, setRightWidth] = useState<number>(35); // Notes (35%)
  // Center (transcript) takes remaining: 100 - leftWidth - rightWidth

  const [isResizingLeft, setIsResizingLeft] = useState<boolean>(false);
  const [isResizingRight, setIsResizingRight] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Virtualization state
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(600);
  const activeRowRef = useRef<HTMLDivElement | null>(null);

  // Collapsible sections in notes deck
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    summary: false,
    keyPoints: false,
    definitions: false,
    formulas: false,
  });

  const toggleSection = (sec: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Handle Resizing Mouse Events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const totalWidth = rect.width;

      if (isResizingLeft) {
        const newLeftWidth = Math.max(14, Math.min(30, ((e.clientX - rect.left) / totalWidth) * 100));
        setLeftWidth(newLeftWidth);
      } else if (isResizingRight) {
        const newRightWidth = Math.max(25, Math.min(45, ((rect.right - e.clientX) / totalWidth) * 100));
        setRightWidth(newRightWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight]);

  // Update viewport height on resize and initial mount
  useEffect(() => {
    if (transcriptScrollRef.current) {
      setViewportHeight(transcriptScrollRef.current.clientHeight || 600);
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (transcriptScrollRef.current) {
      setScrollTop(transcriptScrollRef.current.scrollTop);
    }
  }, []);

  if (!transcript || !notes) {
    return (
      <div className="text-center py-24 rounded-lg border border-border bg-surface max-w-xl mx-auto my-8 p-6">
        <BookOpen className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
        <h3 className="text-base font-semibold text-text">No lecture selected</h3>
        <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
          Select a lecture from your Library or upload an audio file to view interactive transcripts, chapter notes, and concepts.
        </p>
      </div>
    );
  }

  const chapters = notes.chapters || [];
  const selectedChapter = chapters[selectedChapterIdx] || chapters[0];

  // Filter segments
  const segments = transcript.segments || [];
  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return segments;
    const q = searchQuery.toLowerCase();
    return segments.filter((seg) => seg.text.toLowerCase().includes(q));
  }, [segments, searchQuery]);

  // Detect active segment
  const activeSegmentIdx = useMemo(() => {
    return filteredSegments.findIndex((s) => currentTime >= s.start && currentTime <= s.end);
  }, [filteredSegments, currentTime]);

  // Virtualization calculations
  const totalCount = filteredSegments.length;
  const totalVirtualHeight = totalCount * ESTIMATED_ITEM_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ESTIMATED_ITEM_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(
    totalCount - 1,
    Math.ceil((scrollTop + viewportHeight) / ESTIMATED_ITEM_HEIGHT) + OVERSCAN
  );
  const visibleSegments = filteredSegments.slice(startIndex, endIndex + 1);

  // Auto-scroll when following transcript
  useEffect(() => {
    if (followTranscript && activeSegmentIdx !== -1 && transcriptScrollRef.current) {
      const targetScroll = activeSegmentIdx * ESTIMATED_ITEM_HEIGHT - viewportHeight / 2 + ESTIMATED_ITEM_HEIGHT / 2;
      transcriptScrollRef.current.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  }, [activeSegmentIdx, followTranscript, viewportHeight]);

  const handleCopyNotes = async () => {
    const textToCopy = notes.overall_summary || notes.summary || '';
    const ok = await copyToClipboard(textToCopy);
    if (ok) {
      setCopiedNotes(true);
      setTimeout(() => setCopiedNotes(false), 2000);
    }
  };

  const handleSaveCorrection = (actualSegIdx: number) => {
    if (onAddCorrection && editText.trim()) {
      const original = segments[actualSegIdx]?.text || '';
      onAddCorrection(original, editText);
    }
    setEditingSegmentIdx(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Meta Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-accent-tint border border-accent/20 flex items-center justify-center text-accent shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-text truncate">{subjectTitle}</h2>
            <div className="flex items-center gap-2 text-xs text-muted font-mono">
              <span>ASR: {transcript.asr_model}</span>
              <span>•</span>
              <span className="tabular-nums">{segments.length} segments</span>
              <span>•</span>
              <span className="capitalize">{transcript.language || 'en'}</span>
            </div>
          </div>
        </div>

        {/* Mobile View Switcher (<1024px) */}
        <div className="flex lg:hidden items-center rounded-md border border-border bg-surface p-0.5 text-xs">
          <button
            onClick={() => setActiveMobilePane('transcript')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeMobilePane === 'transcript' ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'
            }`}
          >
            Transcript
          </button>
          <button
            onClick={() => setActiveMobilePane('notes')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeMobilePane === 'notes' ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'
            }`}
          >
            Notes
          </button>
          <button
            onClick={() => setActiveMobilePane('chapters')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeMobilePane === 'chapters' ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'
            }`}
          >
            Chapters ({chapters.length})
          </button>
        </div>

        {/* Action buttons */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={handleCopyNotes}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-surface text-xs font-medium text-text hover:border-accent hover:text-accent transition-colors"
          >
            {copiedNotes ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedNotes ? 'Copied summary' : 'Copy summary'}</span>
          </button>
          <button
            onClick={() => downloadMarkdown(notes, subjectTitle)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-accent text-on-accent text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export markdown</span>
          </button>
        </div>
      </div>

      {/* Main 3-Pane Desktop Layout & Mobile View */}
      <div
        ref={containerRef}
        className="relative flex flex-col lg:flex-row rounded-lg border border-border bg-surface overflow-hidden min-h-[640px]"
      >
        {/* PANE 1: CHAPTERS & INDEX */}
        <div
          style={{ width: `${leftWidth}%` }}
          className={`shrink-0 border-r border-border bg-bg/40 flex flex-col ${
            activeMobilePane === 'chapters' ? 'flex w-full' : 'hidden lg:flex'
          }`}
        >
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-semibold text-text flex items-center gap-1.5">
              <List className="w-3.5 h-3.5 text-accent" />
              <span>Chapters ({chapters.length})</span>
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chapters.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted">No chapters detected</div>
            ) : (
              chapters.map((ch, idx) => {
                const isSelected = selectedChapterIdx === idx;
                const isCurrent = currentTime >= ch.start && currentTime <= ch.end;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedChapterIdx(idx);
                      onSeek(ch.start);
                    }}
                    className={`w-full text-left p-2.5 rounded-md text-xs transition-colors flex flex-col gap-1 border ${
                      isSelected || isCurrent
                        ? 'bg-accent-tint border-accent/30 text-accent font-medium'
                        : 'border-transparent text-muted hover:text-text hover:bg-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono text-[11px] tabular-nums">
                      <span>{formatTime(ch.start)}</span>
                      <span>{formatTime(ch.end - ch.start)}</span>
                    </div>
                    <span className="truncate leading-snug">{ch.title}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Left Resizer Handle (Desktop Only) */}
        <div
          onMouseDown={() => setIsResizingLeft(true)}
          className="hidden lg:block w-1.5 -ml-0.5 cursor-col-resize hover:bg-accent/40 active:bg-accent transition-colors z-10 shrink-0"
          title="Drag to resize chapter pane"
        />

        {/* PANE 2: SYNCHRONIZED TRANSCRIPT */}
        <div
          style={{ width: `${100 - leftWidth - rightWidth}%` }}
          className={`flex-1 flex flex-col min-w-0 border-r border-border bg-surface ${
            activeMobilePane === 'transcript' ? 'flex w-full' : 'hidden lg:flex'
          }`}
        >
          {/* Transcript Search Bar */}
          <div className="p-3 border-b border-border flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search transcript phrases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg border border-border rounded-md pl-8 pr-3 py-1 text-xs text-text placeholder:text-muted focus:outline-none focus:border-accent"
              />
            </div>
            {searchQuery && (
              <span className="text-xs text-muted font-mono tabular-nums shrink-0">
                {filteredSegments.length} matches
              </span>
            )}
          </div>

          {/* Virtualized Segments List */}
          <div
            ref={transcriptScrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto relative p-3"
            style={{ minHeight: '520px' }}
          >
            {filteredSegments.length === 0 ? (
              <div className="text-center py-16 text-xs text-muted">
                No transcript segments found matching "{searchQuery}".
              </div>
            ) : (
              <div style={{ height: `${totalVirtualHeight}px`, position: 'relative', width: '100%' }}>
                {visibleSegments.map((seg, vIdx) => {
                  const actualIdx = startIndex + vIdx;
                  const isActive = actualIdx === activeSegmentIdx;
                  const isLecturer =
                    seg.speaker.toLowerCase().includes('lecturer') ||
                    seg.speaker.toLowerCase().includes('prof') ||
                    seg.speaker.toLowerCase().includes('speaker_0');
                  const isEditing = editingSegmentIdx === actualIdx;
                  const topOffset = actualIdx * ESTIMATED_ITEM_HEIGHT;

                  return (
                    <div
                      key={actualIdx}
                      ref={isActive ? activeRowRef : null}
                      style={{
                        position: 'absolute',
                        top: `${topOffset}px`,
                        left: 0,
                        right: 0,
                        minHeight: `${ESTIMATED_ITEM_HEIGHT - 8}px`,
                      }}
                      className="pb-2"
                    >
                      <div
                        onClick={() => onSeek(seg.start)}
                        className={`p-3 rounded-md border text-xs transition-all cursor-pointer group ${
                          isActive
                            ? 'bg-accent-tint/60 border-accent text-text ring-1 ring-accent/30'
                            : 'bg-bg/40 border-border hover:border-accent/40 text-text'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                isLecturer
                                  ? 'bg-accent-tint text-accent border-accent/20'
                                  : 'bg-surface text-muted border-border'
                              }`}
                            >
                              {isLecturer ? 'Lecturer' : seg.speaker || 'Speaker'}
                            </span>
                            <span className="text-[11px] font-mono text-muted tabular-nums">
                              {formatTime(seg.start)} - {formatTime(seg.end)}
                            </span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSegmentIdx(actualIdx);
                              setEditText(seg.text);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-text rounded transition-opacity"
                            title="Submit correction for LoRA tuning"
                            aria-label="Submit correction for LoRA tuning"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>

                        {isEditing ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-2 p-2 bg-surface rounded border border-border space-y-2"
                          >
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full bg-bg text-xs text-text p-2 rounded border border-border focus:outline-none focus:border-accent"
                              rows={3}
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingSegmentIdx(null)}
                                className="px-2 py-1 text-xs text-muted hover:text-text"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveCorrection(actualIdx)}
                                className="px-2.5 py-1 bg-accent text-on-accent text-xs font-medium rounded hover:opacity-90"
                              >
                                Save correction
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="leading-relaxed">
                            {seg.words && seg.words.length > 0
                              ? seg.words.map((w, wIdx) => {
                                  const isWordActive =
                                    currentTime >= w.start && currentTime <= w.end;
                                  return (
                                    <span
                                      key={wIdx}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSeek(w.start);
                                      }}
                                      className={`inline-block mr-1 transition-colors hover:underline hover:text-accent ${
                                        isWordActive ? 'text-accent font-semibold' : ''
                                      }`}
                                    >
                                      {w.w}
                                    </span>
                                  );
                                })
                              : seg.text}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Resizer Handle (Desktop Only) */}
        <div
          onMouseDown={() => setIsResizingRight(true)}
          className="hidden lg:block w-1.5 -ml-0.5 cursor-col-resize hover:bg-accent/40 active:bg-accent transition-colors z-10 shrink-0"
          title="Drag to resize notes pane"
        />

        {/* PANE 3: CHAPTER SYNTHESIS & STUDY DECK */}
        <div
          style={{ width: `${rightWidth}%` }}
          className={`shrink-0 flex flex-col bg-bg/30 ${
            activeMobilePane === 'notes' ? 'flex w-full' : 'hidden lg:flex'
          }`}
        >
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h3 className="text-xs font-semibold text-text flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-accent" />
              <span>Study deck</span>
            </h3>
            <span className="text-[11px] font-mono text-muted">
              Chapter {selectedChapterIdx + 1} of {Math.max(1, chapters.length)}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Executive Chapter Summary */}
            <div className="rounded-md border border-border bg-surface overflow-hidden">
              <button
                onClick={() => toggleSection('summary')}
                className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-text hover:bg-bg/50 transition-colors"
              >
                <span>Executive summary</span>
                {collapsedSections.summary ? (
                  <ChevronRight className="w-3.5 h-3.5 text-muted" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted" />
                )}
              </button>
              {!collapsedSections.summary && (
                <div className="p-3 pt-0 text-xs text-muted leading-relaxed border-t border-border mt-1">
                  <p className="mt-2 text-text font-normal">
                    {selectedChapter?.summary || notes.overall_summary || notes.summary || 'Summary generated from local lecture transcript.'}
                  </p>
                </div>
              )}
            </div>

            {/* Key Points & Takeaways */}
            {selectedChapter?.key_points && selectedChapter.key_points.length > 0 && (
              <div className="rounded-md border border-border bg-surface overflow-hidden">
                <button
                  onClick={() => toggleSection('keyPoints')}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-text hover:bg-bg/50 transition-colors"
                >
                  <span>Key points ({selectedChapter.key_points.length})</span>
                  {collapsedSections.keyPoints ? (
                    <ChevronRight className="w-3.5 h-3.5 text-muted" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-muted" />
                  )}
                </button>
                {!collapsedSections.keyPoints && (
                  <ul className="p-3 pt-0 space-y-1.5 border-t border-border mt-1 list-disc list-inside text-xs text-text">
                    {selectedChapter.key_points.map((pt, i) => (
                      <li key={i} className="leading-normal">
                        {pt}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Core Definitions */}
            {selectedChapter?.definitions && selectedChapter.definitions.length > 0 && (
              <div className="rounded-md border border-border bg-surface overflow-hidden">
                <button
                  onClick={() => toggleSection('definitions')}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-text hover:bg-bg/50 transition-colors"
                >
                  <span>Definitions ({selectedChapter.definitions.length})</span>
                  {collapsedSections.definitions ? (
                    <ChevronRight className="w-3.5 h-3.5 text-muted" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-muted" />
                  )}
                </button>
                {!collapsedSections.definitions && (
                  <div className="p-3 pt-0 space-y-2 border-t border-border mt-1 text-xs">
                    {selectedChapter.definitions.map((def, i) => (
                      <div key={i} className="p-2 rounded bg-bg border border-border text-text">
                        {def}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Formulas & Code Snippets */}
            {((selectedChapter?.formulas && selectedChapter.formulas.length > 0) ||
              (selectedChapter?.examples && selectedChapter.examples.length > 0)) && (
              <div className="rounded-md border border-border bg-surface overflow-hidden">
                <button
                  onClick={() => toggleSection('formulas')}
                  className="w-full flex items-center justify-between p-2.5 text-xs font-semibold text-text hover:bg-bg/50 transition-colors"
                >
                  <span>Formulas & examples</span>
                  {collapsedSections.formulas ? (
                    <ChevronRight className="w-3.5 h-3.5 text-muted" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-muted" />
                  )}
                </button>
                {!collapsedSections.formulas && (
                  <div className="p-3 pt-0 space-y-2 border-t border-border mt-1 text-xs">
                    {selectedChapter?.formulas?.map((f, i) => (
                      <pre
                        key={i}
                        className="p-2 rounded bg-bg border border-border font-mono text-xs overflow-x-auto text-accent"
                      >
                        {f}
                      </pre>
                    ))}
                    {selectedChapter?.examples?.map((ex, i) => (
                      <p key={i} className="text-muted italic">
                        {ex}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
