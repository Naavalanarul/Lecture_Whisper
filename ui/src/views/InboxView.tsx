import React, { useState } from 'react';
import {
  Inbox,
  Search,
  Upload,
  Play,
  Clock,
  Calendar,
  Sparkles,
  FileAudio,
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileText,
  RotateCw,
  FolderOpen,
} from 'lucide-react';
import { Recording } from '../types';
import { formatTime, formatDate } from '../utils/formatters';

interface InboxViewProps {
  recordings: Recording[];
  selectedRecId: string | null;
  onSelectRecording: (id: string) => void;
  onQueueProcessing: (id: string) => void;
  onExportNotes?: (rec: Recording) => void;
  onUploadFile?: (file: File) => void;
}

export const InboxView: React.FC<InboxViewProps> = ({
  recordings,
  selectedRecId,
  onSelectRecording,
  onQueueProcessing,
  onExportNotes,
  onUploadFile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isDragging, setIsDragging] = useState(false);

  const filtered = recordings.filter((r) => {
    const matchesSearch =
      (r.subject || 'Lecture').toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'ready') return matchesSearch && (r.status === 'completed' || r.status === 'uploaded');
    if (filterStatus === 'processing') return matchesSearch && (r.status === 'processing' || r.status === 'queued');
    return matchesSearch;
  });

  const totalDuration = recordings.reduce((acc, r) => acc + (r.duration_s || 0), 0);
  const totalHours = (totalDuration / 3600).toFixed(1);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onUploadFile) {
      onUploadFile(e.dataTransfer.files[0]);
    }
  };

  const getSubjectColor = (subject?: string) => {
    if (!subject) return 'bg-slate-800 text-slate-300 border-slate-700';
    if (subject.includes('CS') || subject.includes('Code') || subject.includes('Algorithm')) {
      return 'bg-brand-500/10 text-brand-300 border-brand-500/20';
    }
    if (subject.includes('MATH') || subject.includes('Physics')) {
      return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20';
    }
    if (subject.includes('BIO') || subject.includes('Chem')) {
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    }
    return 'bg-purple-500/10 text-purple-300 border-purple-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Recorded Lectures</span>
            <FolderOpen className="w-4 h-4 text-brand-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{recordings.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Directly synced over local LAN</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Audio Hours Captured</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">{totalHours} hrs</p>
          <p className="text-[11px] text-slate-500 mt-1">16kHz Mono AAC lossless sync</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Local Neural Models</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">MLX Whisper</p>
          <p className="text-[11px] text-slate-500 mt-1">Large-v3-Turbo + PyAnnote CPU</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Data Privacy Guarantee</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white font-mono">100% Local</p>
          <p className="text-[11px] text-slate-500 mt-1">Zero cloud telemetry or storage</p>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-card p-3 rounded-2xl border border-white/10">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search lectures by subject or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-950 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center bg-surface-950 p-1 rounded-xl border border-white/5 text-xs">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-brand-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({recordings.length})
            </button>
            <button
              onClick={() => setFilterStatus('ready')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filterStatus === 'ready'
                  ? 'bg-brand-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ready
            </button>
            <button
              onClick={() => setFilterStatus('processing')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filterStatus === 'processing'
                  ? 'bg-brand-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Processing
            </button>
          </div>

          <label className="flex items-center gap-1.5 px-3 py-2 bg-surface-900 hover:bg-surface-850 text-slate-300 hover:text-white rounded-xl border border-white/10 text-xs font-semibold cursor-pointer transition-all active:scale-95 shrink-0">
            <Upload className="w-3.5 h-3.5 text-brand-400" />
            <span>Upload Audio</span>
            <input
              type="file"
              accept="audio/*,.wav,.m4a,.mp3,.aac,.ogg"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0] && onUploadFile) {
                  onUploadFile(e.target.files[0]);
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Drag and drop banner */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
          isDragging
            ? 'border-brand-500 bg-brand-500/5'
            : 'border-white/10 bg-surface-900/40 hover:border-white/20'
        }`}
      >
        <FileAudio className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-300">
          Drop audio files here to process manually (.m4a, .wav, .mp3)
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Pixel 8a recordings will auto-upload here over local Wi-Fi via tus v1.0.0
        </p>
      </div>

      {/* Recording Cards Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl border border-white/10">
          <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No lecture recordings found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Record a lecture on your paired Pixel 8a or upload an audio file to view interactive notes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((rec) => {
            const isSelected = selectedRecId === rec.id;
            const isProcessing = rec.status === 'processing' || rec.status === 'queued';

            return (
              <div
                key={rec.id}
                className={`glass-card rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between hover-glow ${
                  isSelected ? 'border-brand-500 ring-1 ring-brand-500/50' : 'border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getSubjectColor(
                        rec.subject
                      )}`}
                    >
                      {rec.subject || 'CS 106B Dynamic Programming'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formatTime(rec.duration_s || 0)}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white mb-1 leading-snug">
                    {rec.subject
                      ? `${rec.subject} — Lecture Session`
                      : 'CS 106B — Dynamic Programming & Memoization'}
                  </h4>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{formatDate(rec.started_at)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono mb-4">
                    <span>{rec.chunk_count} chunks</span>
                    <span>•</span>
                    <span className="truncate max-w-[150px]">sha: {rec.sha256.slice(0, 10)}...</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                  <button
                    onClick={() => onSelectRecording(rec.id)}
                    className="flex-1 py-2 px-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-brand-600/20 transition-all active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Open Lecture</span>
                  </button>

                  <button
                    onClick={() => onQueueProcessing(rec.id)}
                    disabled={isProcessing}
                    className="p-2 bg-surface-950 hover:bg-surface-850 text-slate-300 hover:text-white rounded-xl border border-white/10 transition-colors disabled:opacity-50"
                    title="Re-run Pipeline"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin text-brand-400' : ''}`} />
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
