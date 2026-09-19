import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { JobProgress } from '../types';

interface JobStatusBarProps {
  onJobCompleted?: (jobId: string) => void;
}

export const JobStatusBar: React.FC<JobStatusBarProps> = ({ onJobCompleted }) => {
  const [activeJob, setActiveJob] = useState<JobProgress | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/jobs/events/stream');
      eventSource.addEventListener('job_progress', (e) => {
        try {
          const progress: JobProgress = JSON.parse(e.data);
          setActiveJob(progress);
          setDismissed(false);
          if (progress.status === 'completed' && onJobCompleted) {
            onJobCompleted(progress.job_id);
          }
        } catch {
          // ignore json parse error
        }
      });
    } catch {
      // EventSource failed or offline
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [onJobCompleted]);

  if (!activeJob || dismissed) return null;

  const stageLabels: Record<string, string> = {
    starting: 'Initializing Pipeline',
    normalizing: 'Audio Normalization (16kHz Mono WAV)',
    vad: 'Silero Voice Activity Detection',
    asr: 'MLX Whisper Speech Recognition',
    diarization: 'PyAnnote Speaker Diarization (CPU)',
    speaker_stats: 'Talk-Time & Lecturer Profiling',
    chapters: 'Semantic Topic Segmentation',
    notes: 'MLX-LM Notes Map-Reduce',
    events: 'Resolving Academic Deadlines',
    completed: 'Pipeline Complete',
    failed: 'Pipeline Processing Error',
  };

  const currentLabel = activeJob.stage ? stageLabels[activeJob.stage] || activeJob.stage : 'Processing...';
  const percent = Math.min(Math.max(Math.round((activeJob.progress || 0) * 100), 0), 100);

  return (
    <div className="w-full bg-gradient-to-r from-surface-900 via-surface-850 to-surface-900 border-b border-white/10 px-4 py-2.5 shadow-lg relative overflow-hidden transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
            {activeJob.status === 'processing' ? (
              <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
            ) : activeJob.status === 'completed' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {activeJob.status === 'processing' ? 'Local Neural Engine Active' : 'Task Status'}
              </span>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {percent}%
              </span>
            </div>
            <p className="text-sm font-medium text-slate-200 truncate mt-0.5">
              {currentLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="w-36 md:w-56 h-2 bg-surface-950 rounded-full overflow-hidden border border-white/5 relative">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                activeJob.status === 'failed'
                  ? 'bg-rose-500'
                  : activeJob.status === 'completed'
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-brand-500 to-cyan-400'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors"
            title="Dismiss status bar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
