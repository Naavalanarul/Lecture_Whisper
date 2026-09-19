import React, { useState } from 'react';
import {
  Users,
  Mic,
  Award,
  CheckCircle2,
  Activity,
  Play,
  Volume2,
  Clock,
  Gauge,
  Sparkles,
  Info,
} from 'lucide-react';
import { formatTime } from '../utils/formatters';
import { SpeakerStats } from '../types';

interface SpeakersViewProps {
  speakerStats?: SpeakerStats;
  onEnrolVoiceprint?: (speakerId: string) => void;
  onSeekAudio?: (time: number) => void;
}

export const SpeakersView: React.FC<SpeakersViewProps> = ({
  speakerStats,
  onEnrolVoiceprint,
  onSeekAudio,
}) => {
  const [enrolledSpeakers, setEnrolledSpeakers] = useState<Set<string>>(new Set());

  if (
    !speakerStats ||
    !speakerStats.speaker_distribution ||
    Object.keys(speakerStats.speaker_distribution).length === 0
  ) {
    return (
      <div className="text-center py-20 rounded-lg border border-border bg-surface p-6">
        <Users className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
        <h3 className="text-base font-semibold text-text">No speaker diarization data</h3>
        <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
          Process a lecture recording to analyze speaker talk-time distribution, silence ratio, speaking pace, and voiceprints.
        </p>
      </div>
    );
  }

  const totalDuration = speakerStats.total_duration_s || 85.0;
  const totalSpeech = speakerStats.total_speech_time_s || 85.0;
  const silenceTime = speakerStats.silence_time_s || Math.max(0, totalDuration - totalSpeech);

  // Compute speaker records
  const speakers = Object.entries(speakerStats.speaker_distribution).map(([id, share], idx) => {
    const isLecturer = id === speakerStats.lecturer_speaker_id;
    const talkTime = speakerStats.talk_times?.[id] || 0;
    const wpm = speakerStats.wpm?.[id] || 140;
    const isEnrolled = enrolledSpeakers.has(id);

    return {
      id,
      name: isLecturer ? 'Primary Lecturer' : `Speaker ${idx + 1}`,
      role: isLecturer ? 'Primary lecturer (>70% dominance)' : 'Discussion / Student query',
      talkTime,
      share: share, // already 0-100 percentage
      wpm,
      isLecturer,
      isEnrolled,
    };
  });

  const handleEnrol = (id: string) => {
    setEnrolledSpeakers((prev) => new Set(prev).add(id));
    if (onEnrolVoiceprint) onEnrolVoiceprint(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text">Speaker intelligence & talk time</h2>
          <p className="text-xs text-muted mt-0.5">
            Diarized on local CPU via PyAnnote with reconciled speech vs silence accounting and WPM pace metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-accent-tint text-accent border border-accent/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Voiceprint engine active</span>
          </span>
        </div>
      </div>

      {/* Reconciled Stacked Talk-Time Bar */}
      <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-text">Speech vs silence breakdown</span>
          <div className="flex items-center gap-3 font-mono text-muted tabular-nums">
            <span>Speech: {formatTime(totalSpeech)}</span>
            <span>•</span>
            <span>Silence: {formatTime(silenceTime)}</span>
            <span>•</span>
            <span className="text-text font-medium">Total: {formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Stacked Bar with Silence Accounting */}
        <div className="h-4 bg-bg rounded-md overflow-hidden flex border border-border">
          {speakers.map((spk, idx) => (
            <div
              key={idx}
              className={`h-full transition-all relative ${
                spk.isLecturer ? 'bg-accent' : 'bg-accent/60'
              }`}
              style={{ width: `${(spk.talkTime / totalDuration) * 100}%` }}
              title={`${spk.name}: ${spk.share.toFixed(1)}% of speech`}
            />
          ))}
          {silenceTime > 0 && (
            <div
              className="h-full bg-border"
              style={{ width: `${(silenceTime / totalDuration) * 100}%` }}
              title={`Silence / Pause: ${formatTime(silenceTime)}`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
          {speakers.map((spk, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span
                className={`w-3 h-3 rounded-sm ${
                  spk.isLecturer ? 'bg-accent' : 'bg-accent/60'
                }`}
              />
              <span className="text-text font-medium">{spk.name}</span>
              <span className="text-muted font-mono tabular-nums">({spk.share.toFixed(1)}%)</span>
            </div>
          ))}
          {silenceTime > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-border" />
              <span className="text-muted">Silence & pauses</span>
              <span className="text-muted font-mono tabular-nums">
                ({((silenceTime / totalDuration) * 100).toFixed(1)}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Speaker Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {speakers.map((spk) => (
          <div
            key={spk.id}
            className="rounded-lg border border-border bg-surface p-4 flex flex-col justify-between space-y-4 hover:border-accent/40 transition-colors"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-md flex items-center justify-center font-bold text-sm border ${
                      spk.isLecturer
                        ? 'bg-accent-tint text-accent border-accent/30'
                        : 'bg-bg text-muted border-border'
                    }`}
                  >
                    {spk.isLecturer ? 'L' : spk.id.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-text">{spk.name}</h4>
                    <p className="text-xs text-muted">{spk.role}</p>
                  </div>
                </div>

                {spk.isLecturer && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono border border-accent/30 bg-accent-tint text-accent">
                    Primary
                  </span>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-md bg-bg border border-border text-center">
                <div>
                  <span className="text-[11px] text-muted block">Talk time</span>
                  <span className="text-xs font-mono font-medium text-text tabular-nums">
                    {formatTime(spk.talkTime)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted block">Speech share</span>
                  <span className="text-xs font-mono font-medium text-text tabular-nums">
                    {spk.share.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted block">Speaking pace</span>
                  <span className="text-xs font-mono font-medium text-text tabular-nums">
                    {spk.wpm} WPM
                  </span>
                </div>
              </div>
            </div>

            {/* Enrol Voiceprint Action */}
            <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
              <span className="text-muted text-[11px]">
                {spk.isEnrolled ? 'Voiceprint enrolled' : 'Save profile for cross-lecture matching'}
              </span>

              <button
                onClick={() => handleEnrol(spk.id)}
                disabled={spk.isEnrolled}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                  spk.isEnrolled
                    ? 'border-accent/30 bg-accent-tint text-accent opacity-90'
                    : 'border-border bg-surface text-text hover:border-accent hover:text-accent'
                }`}
              >
                {spk.isEnrolled ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                    <span>Enrolled</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-accent" />
                    <span>Enrol voiceprint</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
