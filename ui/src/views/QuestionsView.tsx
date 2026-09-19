import React, { useState, useEffect, useMemo } from 'react';
import {
  HelpCircle,
  Star,
  Play,
  User,
  GraduationCap,
  Quote,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import { ImportantQuestion } from '../types';
import { formatTime } from '../utils/formatters';

interface QuestionsViewProps {
  questions: ImportantQuestion[];
  onSeekAudio: (time: number) => void;
}

const STORAGE_KEY = 'lecturewhisper_starred_questions';

export const QuestionsView: React.FC<QuestionsViewProps> = ({ questions, onSeekAudio }) => {
  const [starredQuestions, setStarredQuestions] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return new Set(JSON.parse(saved));
    } catch {}
    return new Set();
  });

  const [activeFilter, setActiveFilter] = useState<'all' | 'flagged' | 'student' | 'starred'>('all');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(starredQuestions)));
    } catch {}
  }, [starredQuestions]);

  const toggleStar = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarredQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const filtered = useMemo(() => {
    return questions.filter((q, idx) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'starred') return starredQuestions.has(idx);
      if (activeFilter === 'flagged') return q.reason === 'teacher_flagged';
      if (activeFilter === 'student') return q.student_asked;
      return true;
    });
  }, [questions, activeFilter, starredQuestions]);

  const getReasonLabel = (q: ImportantQuestion) => {
    if (q.student_asked) return 'Student inquiry';
    if (q.lecturer_self_answered) return 'Lecturer rhetorical / test concept';
    if (q.reason === 'teacher_flagged') return 'Lecturer flagged';
    if (q.reason === 'posed_to_class') return 'Posed to class';
    return 'Key question';
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text">Important questions & concepts</h2>
          <p className="text-xs text-muted mt-0.5">
            Grounded Q&A extracted directly from the lecture transcript, with spoken answers and timestamps.
          </p>
        </div>

        {/* Filter Segmented Control */}
        <div className="inline-flex rounded-md border border-border bg-surface p-0.5 text-xs">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeFilter === 'all' ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'
            }`}
          >
            All ({questions.length})
          </button>
          <button
            onClick={() => setActiveFilter('flagged')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeFilter === 'flagged' ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'
            }`}
          >
            Lecturer flagged
          </button>
          <button
            onClick={() => setActiveFilter('student')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeFilter === 'student' ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'
            }`}
          >
            Student inquiries
          </button>
          <button
            onClick={() => setActiveFilter('starred')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeFilter === 'starred' ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'
            }`}
          >
            Starred ({starredQuestions.size})
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 rounded-lg border border-border bg-surface p-6">
          <HelpCircle className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-text">No questions found</h3>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            Questions posed during the lecture or flagged for exam review will appear here once audio is transcribed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((q, idx) => {
            const originalIndex = questions.indexOf(q);
            const isStarred = starredQuestions.has(originalIndex !== -1 ? originalIndex : idx);
            const answer = q.answer_text || 'No answer given in this lecture';

            return (
              <div
                key={idx}
                className="rounded-lg border border-border bg-surface p-4 flex flex-col justify-between transition-all hover:border-accent/40"
              >
                <div className="space-y-3">
                  {/* Card Meta */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono border border-accent/20 bg-accent-tint text-accent">
                        {q.student_asked ? (
                          <User className="w-3 h-3" />
                        ) : (
                          <GraduationCap className="w-3 h-3" />
                        )}
                        <span>{getReasonLabel(q)}</span>
                      </span>
                    </div>

                    <button
                      onClick={(e) => toggleStar(originalIndex !== -1 ? originalIndex : idx, e)}
                      className={`p-1 rounded transition-colors ${
                        isStarred ? 'text-accent' : 'text-muted hover:text-text'
                      }`}
                      title={isStarred ? 'Remove from starred' : 'Star for exam revision'}
                      aria-label={isStarred ? 'Unstar question' : 'Star question'}
                    >
                      <Star className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* Spoken Question */}
                  <div>
                    <h4 className="text-sm font-semibold text-text leading-snug">
                      "{q.text}"
                    </h4>
                  </div>

                  {/* Grounded Spoken Answer or Fallback */}
                  <div className="p-3 bg-bg rounded-md border border-border text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted font-medium">
                      <span className="flex items-center gap-1 text-accent">
                        <MessageSquare className="w-3 h-3" />
                        <span>Lecture answer</span>
                      </span>
                      {q.answer_start_s !== undefined && q.answer_start_s !== null && (
                        <button
                          onClick={() => onSeekAudio(q.answer_start_s!)}
                          className="font-mono tabular-nums hover:text-accent flex items-center gap-1 transition-colors"
                          title="Seek to answer start"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>{formatTime(q.answer_start_s)}</span>
                        </button>
                      )}
                    </div>
                    <p className="text-text leading-relaxed font-normal">{answer}</p>
                  </div>

                  {/* Transcript Context Snippet if available */}
                  {q.transcript_snippet && (
                    <div className="text-[11px] text-muted italic flex items-start gap-1.5 pl-1">
                      <Quote className="w-3 h-3 text-accent shrink-0 mt-0.5" />
                      <p className="leading-normal line-clamp-2">"{q.transcript_snippet}"</p>
                    </div>
                  )}
                </div>

                {/* Footer with Audio Jump */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-border text-xs">
                  <span className="font-mono text-muted tabular-nums">
                    Question at: {formatTime(q.start_s)}
                  </span>

                  <button
                    onClick={() => onSeekAudio(q.start_s)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-accent text-on-accent text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Listen</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
