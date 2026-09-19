import React, { useState } from 'react';
import { Repeat, Sparkles, MessageSquare, Play, Flame, BarChart2 } from 'lucide-react';
import { Phrases } from '../types';
import { formatTime } from '../utils/formatters';

interface PhrasesViewProps {
  phrases?: Phrases;
  onSeekAudio?: (time: number) => void;
}

export const PhrasesView: React.FC<PhrasesViewProps> = ({ phrases, onSeekAudio }) => {
  const [activeTab, setActiveTab] = useState<'emphasis' | 'habits'>('emphasis');

  const defaultEmphasis = [
    { phrase: 'dynamic programming', count: 7, spans: [[0.0, 8.5], [50.0, 65.0]] as [number, number][] },
    { phrase: 'optimal substructure', count: 5, spans: [[38.0, 49.0]] as [number, number][] },
    { phrase: 'overlapping subproblems', count: 4, spans: [[38.0, 49.0], [50.0, 65.0]] as [number, number][] },
    { phrase: 'memoization cache', count: 3, spans: [[72.5, 85.0]] as [number, number][] },
    { phrase: 'bottom-up tabulation', count: 2, spans: [[72.5, 85.0]] as [number, number][] },
  ];

  const defaultHabits = [
    { phrase: 'you know', count: 12 },
    { phrase: 'basically', count: 8 },
    { phrase: 'so to speak', count: 5 },
    { phrase: 'essentially', count: 4 },
  ];

  const emphasisList = phrases?.emphasis && phrases.emphasis.length > 0 ? phrases.emphasis : defaultEmphasis;
  const habitsList = phrases?.habits && phrases.habits.length > 0 ? phrases.habits : defaultHabits;

  return (
    <div className="space-y-6">
      {/* Header with Tab Switcher */}
      <div className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Repeat className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">Repeated Phrases & Verbal Cadence</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            N-gram frequency separation distinguishing core conceptual themes from subconscious speaker fillers
          </p>
        </div>

        <div className="flex items-center bg-surface-950 p-1 rounded-xl border border-white/5 text-xs">
          <button
            onClick={() => setActiveTab('emphasis')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'emphasis'
                ? 'bg-brand-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Conceptual Emphasis ({emphasisList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('habits')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'habits'
                ? 'bg-brand-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>Verbal Habits & Fillers ({habitsList.length})</span>
          </button>
        </div>
      </div>

      {/* Conceptual Emphasis View */}
      {activeTab === 'emphasis' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {emphasisList.map((item, idx) => (
            <div
              key={idx}
              className="glass-card rounded-2xl p-5 border border-white/10 hover-glow flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Key Concept</span>
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-500/10 text-brand-300 border border-brand-500/20 font-mono">
                    {item.count} occurrences
                  </span>
                </div>

                <h4 className="text-base font-bold text-white mb-2 capitalize">
                  "{item.phrase}"
                </h4>

                <p className="text-xs text-slate-300 leading-relaxed bg-surface-950/60 p-3 rounded-xl border border-white/5">
                  Frequently emphasized by the lecturer during theoretical formulations and proofs.
                </p>
              </div>

              <div className="pt-3 mt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">
                  First spoken at: {item.spans && item.spans[0] ? formatTime(item.spans[0][0]) : '00:00'}
                </span>

                {item.spans && item.spans[0] && onSeekAudio && (
                  <button
                    onClick={() => onSeekAudio(item.spans[0][0])}
                    className="px-2.5 py-1 bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-brand-500/30 transition-colors"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Jump to Audio</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Verbal Habits View */
        <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-white/5">
            <span>Discourse Filler Marker</span>
            <span>Frequency Count</span>
          </div>

          <div className="space-y-4">
            {habitsList.map((item, idx) => {
              const maxCount = Math.max(...habitsList.map((h) => h.count), 1);
              const percent = (item.count / maxCount) * 100;

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200 capitalize">"{item.phrase}"</span>
                    <span className="font-mono text-slate-400 font-medium">{item.count} times</span>
                  </div>

                  <div className="h-2 bg-surface-950 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-500 italic pt-2">
            These verbal mannerisms are automatically filtered out of chapter notes and executive summaries.
          </p>
        </div>
      )}
    </div>
  );
};
