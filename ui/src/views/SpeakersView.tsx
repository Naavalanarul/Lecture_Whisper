import React, { useState } from 'react';
import { Users, Mic, Award, CheckCircle2, ShieldCheck, Activity, Edit2, Play, Sparkles } from 'lucide-react';
import { formatTime } from '../utils/formatters';

interface SpeakersViewProps {
  onEnrolVoiceprint?: (speakerId: string) => void;
  onSeekAudio?: (time: number) => void;
}

export const SpeakersView: React.FC<SpeakersViewProps> = ({ onEnrolVoiceprint, onSeekAudio }) => {
  const [enrolled, setEnrolled] = useState<boolean>(true);
  const [showEnrolSuccess, setShowEnrolSuccess] = useState<boolean>(false);

  const speakers = [
    {
      id: 'SPEAKER_00',
      name: 'Prof. Alan Turing',
      role: 'Main Lecturer',
      talkTime: 72.5,
      share: 0.88,
      wpm: 148,
      turns: 14,
      enrolled: enrolled,
      color: 'from-brand-500 to-cyan-500',
    },
    {
      id: 'SPEAKER_01',
      name: 'Student (Question 1)',
      role: 'Audience Inquiry',
      talkTime: 12.5,
      share: 0.12,
      wpm: 124,
      turns: 3,
      enrolled: false,
      color: 'from-purple-500 to-pink-500',
    },
  ];

  const handleEnrol = (speakerId: string) => {
    setEnrolled(true);
    setShowEnrolSuccess(true);
    setTimeout(() => setShowEnrolSuccess(false), 3000);
    if (onEnrolVoiceprint) onEnrolVoiceprint(speakerId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">Speaker Intelligence & Voiceprint Enrolment</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Diarized via PyAnnote on Apple Silicon CPU with talk-time based lecturer detection
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Voiceprint Engine Active</span>
          </span>
        </div>
      </div>

      {/* Talk-Time Distribution Bar */}
      <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="font-semibold uppercase tracking-wider">Talk-Time Distribution</span>
          <span className="font-mono text-slate-400">Total Speech: 85.0s</span>
        </div>

        <div className="h-4 bg-surface-950 rounded-full overflow-hidden flex border border-white/5">
          {speakers.map((spk, idx) => (
            <div
              key={idx}
              className={`h-full bg-gradient-to-r ${spk.color} transition-all relative group cursor-pointer`}
              style={{ width: `${spk.share * 100}%` }}
              title={`${spk.name}: ${(spk.share * 100).toFixed(0)}%`}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-1 text-xs">
          {speakers.map((spk, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full bg-gradient-to-r ${spk.color}`} />
              <span className="text-slate-300 font-medium">{spk.name}</span>
              <span className="text-slate-500 font-mono">({(spk.share * 100).toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Speaker Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {speakers.map((spk, idx) => (
          <div
            key={idx}
            className="glass-card rounded-2xl p-5 border border-white/10 hover-glow flex flex-col justify-between transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${spk.color} p-0.5 shadow-lg`}
                  >
                    <div className="w-full h-full bg-surface-950 rounded-[14px] flex items-center justify-center font-bold text-white text-sm">
                      {spk.name.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{spk.name}</span>
                      {spk.role.includes('Lecturer') && (
                        <span title="Identified as Primary Lecturer">
                          <Award className="w-4 h-4 text-amber-400" />
                        </span>
                      )}
                    </h4>
                    <span className="text-xs text-brand-400 font-medium">{spk.role}</span>
                  </div>
                </div>

                {spk.enrolled ? (
                  <span className="text-[11px] px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Enrolled</span>
                  </span>
                ) : (
                  <span className="text-[11px] px-2.5 py-1 bg-surface-900 text-slate-400 border border-white/10 rounded-full font-medium">
                    Unenrolled
                  </span>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-surface-950/80 rounded-xl border border-white/5 text-center mb-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Talk Time</span>
                  <p className="text-xs font-bold text-white font-mono mt-0.5">{formatTime(spk.talkTime)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Pace</span>
                  <p className="text-xs font-bold text-white font-mono mt-0.5">{spk.wpm} WPM</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Turns</span>
                  <p className="text-xs font-bold text-white font-mono mt-0.5">{spk.turns}</p>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {spk.role.includes('Lecturer')
                  ? 'High acoustic energy and steady conversational cadence across the entire lecture session.'
                  : 'Brief student intervention seeking clarification on memoization caching mechanism.'}
              </p>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-2 mt-4">
              <span className="text-xs font-mono text-slate-500">ID: {spk.id}</span>

              <button
                onClick={() => handleEnrol(spk.id)}
                className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{spk.enrolled ? 'Update Voiceprint' : 'Enrol Voiceprint'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showEnrolSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Voiceprint successfully registered in local SQLite voiceprint repository!</span>
        </div>
      )}
    </div>
  );
};
