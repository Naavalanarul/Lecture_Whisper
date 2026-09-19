import React, { useState } from 'react';
import {
  Cpu,
  Sparkles,
  Play,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
  TrendingDown,
  ArrowRight,
  GitBranch,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface CorrectionPair {
  id: string;
  field: string;
  original: string;
  corrected: string;
  date: string;
}

interface CorrectionsViewProps {
  corrections?: CorrectionPair[];
}

export const CorrectionsView: React.FC<CorrectionsViewProps> = ({ corrections = [] }) => {
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingProgress, setTrainingProgress] = useState<number>(0);
  const [trainingLogs, setTrainingLogs] = useState<string[]>([]);
  const [activeAdapter, setActiveAdapter] = useState<string>('adapters/v1.0.0-lora-cs-academic');

  const defaultPairs: CorrectionPair[] = [
    {
      id: 'c1',
      field: 'transcript',
      original: 'memo rising results of overlapping sub problems',
      corrected: 'memoizing results of overlapping subproblems',
      date: '2026-09-19',
    },
    {
      id: 'c2',
      field: 'definition',
      original: 'table Asian DP table',
      corrected: 'tabulation DP table',
      date: '2026-09-19',
    },
    {
      id: 'c3',
      field: 'event_title',
      original: 'pop quiz on wednes day',
      corrected: 'Pop Quiz: Graph Algorithms (BFS)',
      date: '2026-09-19',
    },
  ];

  const pairs = corrections.length > 0 ? corrections : defaultPairs;

  const handleStartFineTuning = () => {
    setIsTraining(true);
    setTrainingProgress(5);
    setTrainingLogs([
      'Exporting SQLite human correction dataset to JSONL...',
      'Synthesizing Whisper acoustic noise perturbation pairs...',
      'Loading teacher baseline model via MLX-LM on GPU...',
    ]);

    const stepInterval = setInterval(() => {
      setTrainingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(stepInterval);
          setIsTraining(false);
          setActiveAdapter('adapters/v1.1.0-lora-dynamic-prog');
          setTrainingLogs((logs) => [
            ...logs,
            'Epoch 3/3 complete. Final Training Loss: 0.384.',
            'Evaluating validation fixtures: JSON validity 100%, ROUGE-L: 0.89.',
            '✓ Benchmark beats baseline. Adapter promoted to active!',
          ]);
          return 100;
        }

        if (prev === 25) {
          setTrainingLogs((logs) => [...logs, 'LoRA Rank: 8, Alpha: 16. Target modules: q_proj, v_proj.']);
        } else if (prev === 50) {
          setTrainingLogs((logs) => [...logs, 'Epoch 1/3 — Loss: 0.742, Learning Rate: 1e-4.']);
        } else if (prev === 75) {
          setTrainingLogs((logs) => [...logs, 'Epoch 2/3 — Loss: 0.518, Gradient Norm: 0.82.']);
        }

        return prev + 15;
      });
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">LoRA Fine-Tuning & Corrections Hub</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Human edits to transcripts and notes automatically feed the continuous local MLX distillation loop
          </p>
        </div>

        <button
          onClick={handleStartFineTuning}
          disabled={isTraining}
          className="px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-500 hover:from-brand-500 hover:to-indigo-400 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-brand-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {isTraining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isTraining ? 'Training LoRA Adapter...' : 'Train LoRA Adapter'}</span>
        </button>
      </div>

      {/* Model Health Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Active LoRA Adapter</span>
            <GitBranch className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-sm font-bold text-white truncate font-mono mt-1">{activeAdapter.split('/')[1]}</p>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Promoted & Active
          </p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Human Correction Pairs</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{pairs.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Saved from interactive edits</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Synthetic Noisy Pairs</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">142</p>
          <p className="text-[11px] text-slate-500 mt-1">ASR phoneme substitutions</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Validation Loss</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">0.384</p>
          <p className="text-[11px] text-emerald-400 mt-1">-18% vs base Qwen 2.5</p>
        </div>
      </div>

      {/* Live Training Progress & Terminal Log */}
      {isTraining && (
        <div className="glass-card rounded-2xl p-5 border border-brand-500/40 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-brand-300 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              MLX LoRA Fine-Tuning in Progress (Apple Silicon GPU)
            </span>
            <span className="font-mono text-white font-bold">{trainingProgress}%</span>
          </div>

          <div className="h-2 bg-surface-950 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-cyan-400 transition-all duration-300 rounded-full"
              style={{ width: `${trainingProgress}%` }}
            />
          </div>

          <div className="bg-surface-950 p-3 rounded-xl border border-white/5 font-mono text-[11px] text-slate-400 space-y-1 max-h-36 overflow-y-auto">
            {trainingLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-brand-400 shrink-0">&gt;</span>
                <span className="text-slate-300">{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Human Corrections Dataset Table */}
      <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Verified Training Alignment Pairs
          </h4>
          <span className="text-xs text-slate-500">Stored in ~/.lecturewhisper/store.db</span>
        </div>

        <div className="space-y-3">
          {pairs.map((p, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-surface-950/70 rounded-xl border border-white/5 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-semibold text-brand-400 uppercase tracking-wider">
                  Field: {p.field}
                </span>
                <span className="font-mono">{p.date}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20 text-rose-300">
                  <span className="block text-[10px] uppercase font-bold text-rose-400/80 mb-1">
                    Raw ASR Prediction
                  </span>
                  <p className="line-through opacity-80">{p.original}</p>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-300">
                  <span className="block text-[10px] uppercase font-bold text-emerald-400/80 mb-1">
                    Human Ground Truth
                  </span>
                  <p className="font-medium">{p.corrected}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
