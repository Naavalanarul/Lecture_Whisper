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
    starting: 'Initializing pipeline',
    normalizing: 'Audio normalization (16kHz mono WAV)',
    vad: 'Voice activity detection',
    asr: 'Offline speech recognition',
    diarization: 'Speaker diarization',
    speaker_stats: 'Speaker profiling & talk time',
    chapters: 'Topic segmentation',
    notes: 'Generating structured notes',
    events: 'Resolving academic deadlines',
    completed: 'Pipeline completed successfully',
    failed: 'Pipeline processing error',
  };

  const currentLabel = activeJob.stage ? stageLabels[activeJob.stage] || activeJob.stage : 'Processing...';
  const percent = Math.min(Math.max(Math.round((activeJob.progress || 0) * 100), 0), 100);

  return (
    <div className="w-full bg-surface border-b border-border px-4 py-2 relative overflow-hidden transition-all text-text">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 rounded-md bg-accent-tint border border-accent/20 flex items-center justify-center shrink-0">
            {activeJob.status === 'processing' ? (
              <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />
            ) : activeJob.status === 'completed' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-alert" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-accent flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {activeJob.status === 'processing' ? 'Local pipeline active' : 'Pipeline status'}
              </span>
              <span className="text-xs text-muted font-mono tabular-nums">
                {percent}%
              </span>
            </div>
            <p className="text-xs text-text font-medium truncate mt-0.5">
              {currentLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="w-28 sm:w-44 h-1.5 bg-bg rounded-full overflow-hidden border border-border relative">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                activeJob.status === 'failed' ? 'bg-alert' : 'bg-accent'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="text-muted hover:text-text p-1 rounded-md transition-colors"
            title="Dismiss status bar"
            aria-label="Dismiss status bar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
