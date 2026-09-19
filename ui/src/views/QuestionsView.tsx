import React, { useState } from 'react';
import { HelpCircle, Star, Play, Sparkles, Filter, CheckCircle2, Quote } from 'lucide-react';
import { ImportantQuestion } from '../types';
import { formatTime } from '../utils/formatters';

interface QuestionsViewProps {
  questions: ImportantQuestion[];
  onSeekAudio: (time: number) => void;
}

export const QuestionsView: React.FC<QuestionsViewProps> = ({ questions, onSeekAudio }) => {
  const [starredQuestions, setStarredQuestions] = useState<Set<number>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const toggleStar = (idx: number) => {
    setStarredQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const filtered = questions.filter((q, idx) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'starred') return starredQuestions.has(idx);
    if (activeFilter === 'flagged') return q.reason === 'teacher_flagged';
    if (activeFilter === 'class') return q.reason === 'posed_to_class';
    return true;
  });

  const getReasonBadge = (reason: ImportantQuestion['reason']) => {
    switch (reason) {
      case 'teacher_flagged':
        return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
      case 'posed_to_class':
        return 'bg-brand-500/10 text-brand-300 border-brand-500/20';
      case 'repeated':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">Important Questions & Exam Highlights</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Highlighted based on lecturer tone cues ("pay attention to this"), repetition, or direct student inquiries
          </p>
        </div>

        <div className="flex items-center bg-surface-950 p-1 rounded-xl border border-white/5 text-xs">
          {[
            { id: 'all', label: `All (${questions.length})` },
            { id: 'flagged', label: 'Teacher Flagged' },
            { id: 'class', label: 'Posed to Class' },
            { id: 'starred', label: `Starred (${starredQuestions.size})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                activeFilter === tab.id
                  ? 'bg-brand-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((q, idx) => {
          const isStarred = starredQuestions.has(idx);
          return (
            <div
              key={idx}
              className="glass-card rounded-2xl p-5 border border-white/10 hover-glow flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${getReasonBadge(
                      q.reason
                    )}`}
                  >
                    {q.reason.replace('_', ' ')}
                  </span>

                  <button
                    onClick={() => toggleStar(idx)}
                    className={`p-1 rounded-lg transition-colors ${
                      isStarred ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                    title={isStarred ? 'Unstar question' : 'Star for exam revision'}
                  >
                    <Star className={`w-4 h-4 ${isStarred ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <h4 className="text-sm font-bold text-white mb-3 leading-snug">
                  "{q.text}"
                </h4>

                <div className="p-3 bg-surface-950/80 rounded-xl border border-white/5 text-xs text-slate-300 leading-relaxed">
                  <p className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider mb-1">
                    Key Conceptual Synthesis
                  </p>
                  <p>
                    Optimal substructure allows decomposing a global optimum into local subproblem optima; overlapping subproblems ensure those same subproblems reappear recursively, making memoization beneficial.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5">
                <span className="text-xs font-mono text-slate-400 tabular-nums">
                  Timestamp: {formatTime(q.start_s)}
                </span>

                <button
                  onClick={() => onSeekAudio(q.start_s)}
                  className="px-3 py-1.5 bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-brand-500/30 transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Listen to Context</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
