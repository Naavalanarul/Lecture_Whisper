import React, { useState } from 'react';
import {
  Repeat,
  Sparkles,
  MessageSquare,
  Play,
  Quote,
  Clock,
  Activity,
  Flame,
} from 'lucide-react';
import { Phrases, EmphasisPhrase, HabitPhrase } from '../types';
import { formatTime } from '../utils/formatters';

interface PhrasesViewProps {
  phrases?: Phrases;
  onSeekAudio?: (time: number) => void;
}

export const PhrasesView: React.FC<PhrasesViewProps> = ({ phrases, onSeekAudio }) => {
  const [activeTab, setActiveTab] = useState<'emphasis' | 'habits'>('emphasis');

  const emphasisList = phrases?.emphasis || [];
  const habitsList = phrases?.habits || [];

  return (
    <div className="space-y-6">
      {/* Header with Segmented Tab Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text">Verbal habits & key phrases</h2>
          <p className="text-xs text-muted mt-0.5">
            Differentiates technical emphasis terms from subconscious filler phrases with real transcript context.
          </p>
        </div>

        <div className="inline-flex rounded-md border border-border bg-surface p-0.5 text-xs">
          <button
            onClick={() => setActiveTab('emphasis')}
            className={`px-3 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'emphasis'
                ? 'bg-accent text-on-accent'
                : 'text-muted hover:text-text'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Key concepts ({emphasisList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('habits')}
            className={`px-3 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'habits'
                ? 'bg-accent text-on-accent'
                : 'text-muted hover:text-text'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Verbal habits ({habitsList.length})</span>
          </button>
        </div>
      </div>

      {/* Conceptual Emphasis Tab */}
      {activeTab === 'emphasis' && (
        emphasisList.length === 0 ? (
          <div className="text-center py-20 rounded-lg border border-border bg-surface p-6">
            <Repeat className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-semibold text-text">No technical key phrases detected</h3>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              Repeated technical terminology and emphasized theoretical concepts will appear here once analyzed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emphasisList.map((item, idx) => {
              const firstTime = item.first_occurrence_s ?? (item.spans?.[0]?.[0] || 0);
              const lastTime = item.last_occurrence_s ?? (item.spans?.[item.spans.length - 1]?.[0] || firstTime);
              const interArrival = item.mean_inter_arrival_s ? Math.round(item.mean_inter_arrival_s) : null;

              return (
                <div
                  key={idx}
                  className="rounded-lg border border-border bg-surface p-4 flex flex-col justify-between space-y-3 hover:border-accent/40 transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-accent flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Core concept</span>
                      </span>

                      <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-accent/20 bg-accent-tint text-accent">
                        {item.count} {item.count === 1 ? 'occurrence' : 'occurrences'}
                      </span>
                    </div>

                    <h4 className="text-base font-semibold text-text capitalize">
                      "{item.phrase}"
                    </h4>

                    {/* Grounded Transcript Context */}
                    {item.context_snippet ? (
                      <div className="p-2.5 rounded bg-bg border border-border text-xs text-muted italic flex items-start gap-2">
                        <Quote className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                        <p className="leading-relaxed">"{item.context_snippet}"</p>
                      </div>
                    ) : item.description ? (
                      <p className="text-xs text-muted leading-relaxed">
                        {item.description}
                      </p>
                    ) : null}

                    {/* Occurrence Metrics */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-muted pt-1">
                      <span>First: {formatTime(firstTime)}</span>
                      <span>•</span>
                      <span>Last: {formatTime(lastTime)}</span>
                      {interArrival !== null && (
                        <>
                          <span>•</span>
                          <span>Cadence: ~{interArrival}s</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted font-mono tabular-nums">
                      {formatTime(firstTime)}
                    </span>

                    {onSeekAudio && (
                      <button
                        onClick={() => onSeekAudio(firstTime)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-accent text-on-accent text-xs font-medium hover:opacity-90 transition-opacity"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Listen</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Verbal Habits Tab */}
      {activeTab === 'habits' && (
        habitsList.length === 0 ? (
          <div className="text-center py-20 rounded-lg border border-border bg-surface p-6">
            <MessageSquare className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-semibold text-text">No verbal habit fillers detected</h3>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              Conversational fillers like "you know" or "basically" will be measured here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {habitsList.map((item, idx) => {
              const firstTime = item.first_occurrence_s ?? 0;
              const lastTime = item.last_occurrence_s ?? 0;
              const interArrival = item.mean_inter_arrival_s ? Math.round(item.mean_inter_arrival_s) : null;

              return (
                <div
                  key={idx}
                  className="rounded-lg border border-border bg-surface p-4 flex flex-col justify-between space-y-3 hover:border-accent/40 transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>Conversational filler</span>
                      </span>

                      <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-border bg-bg text-text">
                        {item.count} times
                      </span>
                    </div>

                    <h4 className="text-base font-semibold text-text">
                      "{item.phrase}"
                    </h4>

                    {/* Grounded Transcript Context */}
                    {item.context_snippet ? (
                      <div className="p-2.5 rounded bg-bg border border-border text-xs text-muted italic flex items-start gap-2">
                        <Quote className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                        <p className="leading-relaxed">"{item.context_snippet}"</p>
                      </div>
                    ) : item.description ? (
                      <p className="text-xs text-muted leading-relaxed">
                        {item.description}
                      </p>
                    ) : null}

                    {/* Occurrence Metrics */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-muted pt-1">
                      <span>First: {formatTime(firstTime)}</span>
                      <span>•</span>
                      <span>Last: {formatTime(lastTime)}</span>
                      {interArrival !== null && (
                        <>
                          <span>•</span>
                          <span>Mean interval: ~{interArrival}s</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted font-mono tabular-nums">
                      {formatTime(firstTime)}
                    </span>

                    {onSeekAudio && (
                      <button
                        onClick={() => onSeekAudio(firstTime)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-border bg-surface text-text hover:border-accent hover:text-accent text-xs font-medium transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Listen</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};
