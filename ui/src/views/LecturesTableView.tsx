import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Play,
  RotateCw,
  Clock,
  Calendar,
  Layers,
  CheckSquare,
  Square,
  Upload,
  FileAudio,
  Filter,
} from 'lucide-react';
import { Recording } from '../types';
import { formatTime, formatDate } from '../utils/formatters';

interface LecturesTableViewProps {
  recordings: Recording[];
  selectedRecId: string | null;
  onSelectRecording: (id: string) => void;
  onQueueProcessing: (id: string) => void;
  onUploadFile?: (file: File) => void;
}

type SortField = 'subject' | 'started_at' | 'duration_s' | 'status';
type SortOrder = 'asc' | 'desc';

export const LecturesTableView: React.FC<LecturesTableViewProps> = ({
  recordings,
  selectedRecId,
  onSelectRecording,
  onQueueProcessing,
  onUploadFile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'processing'>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('started_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Distinct subjects for course filter
  const distinctSubjects = useMemo(() => {
    const subjects = new Set<string>();
    recordings.forEach((r) => {
      if (r.subject) subjects.add(r.subject);
    });
    return Array.from(subjects);
  }, [recordings]);

  // Filtering & sorting
  const processedRecordings = useMemo(() => {
    return recordings
      .filter((r) => {
        const matchesSearch =
          (r.subject || 'Lecture').toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
          statusFilter === 'all'
            ? true
            : statusFilter === 'ready'
            ? r.status === 'completed' || r.status === 'uploaded'
            : r.status === 'processing' || r.status === 'queued';

        const matchesSubject =
          selectedSubject === 'all' ? true : r.subject === selectedSubject;

        return matchesSearch && matchesStatus && matchesSubject;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'started_at') {
          const timeA = new Date(valA || 0).getTime();
          const timeB = new Date(valB || 0).getTime();
          return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        }

        if (sortField === 'duration_s') {
          const durA = (valA as number) || 0;
          const durB = (valB as number) || 0;
          return sortOrder === 'asc' ? durA - durB : durB - durA;
        }

        const strA = String(valA || '').toLowerCase();
        const strB = String(valB || '').toLowerCase();
        return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
  }, [recordings, searchTerm, statusFilter, selectedSubject, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === processedRecordings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(processedRecordings.map((r) => r.id)));
    }
  };

  const handleBatchQueue = () => {
    selectedIds.forEach((id) => onQueueProcessing(id));
    setSelectedIds(new Set());
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-muted opacity-40 ml-1 inline" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-accent ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 text-accent ml-1 inline" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title, course, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-border rounded-md pl-9 pr-3 py-1.5 text-xs text-text placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>

          {distinctSubjects.length > 0 && (
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-surface border border-border rounded-md px-2 py-1.5 text-xs text-text focus:outline-none focus:border-accent"
              aria-label="Filter by course"
            >
              <option value="all">All courses</option>
              {distinctSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 justify-between sm:justify-end">
          {/* Status Pills */}
          <div className="inline-flex rounded-md border border-border bg-surface p-0.5 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-accent text-on-accent'
                  : 'text-muted hover:text-text'
              }`}
            >
              All ({recordings.length})
            </button>
            <button
              onClick={() => setStatusFilter('ready')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'ready'
                  ? 'bg-accent text-on-accent'
                  : 'text-muted hover:text-text'
              }`}
            >
              Ready
            </button>
            <button
              onClick={() => setStatusFilter('processing')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === 'processing'
                  ? 'bg-accent text-on-accent'
                  : 'text-muted hover:text-text'
              }`}
            >
              Processing
            </button>
          </div>

          {/* Upload Audio Button */}
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-on-accent rounded-md text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity shrink-0">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload audio</span>
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

      {/* Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-accent-tint border border-accent/30 rounded-md text-xs text-accent">
          <div className="flex items-center gap-2 font-medium">
            <span className="font-mono tabular-nums font-semibold">{selectedIds.size}</span>
            <span>lectures selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchQueue}
              className="px-2.5 py-1 rounded bg-accent text-on-accent font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              <RotateCw className="w-3 h-3" />
              <span>Queue processing</span>
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-2 py-1 text-muted hover:text-text"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Dense Table */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-bg/50 text-muted font-medium select-none">
                <th className="w-10 px-3 py-2.5 text-center">
                  <button
                    onClick={toggleSelectAll}
                    aria-label="Select all rows"
                    className="text-muted hover:text-text inline-flex items-center justify-center"
                  >
                    {selectedIds.size > 0 && selectedIds.size === processedRecordings.length ? (
                      <CheckSquare className="w-3.5 h-3.5 text-accent" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => handleSort('subject')}
                  className="px-3 py-2.5 cursor-pointer hover:text-text"
                >
                  Course & title {renderSortIcon('subject')}
                </th>
                <th
                  onClick={() => handleSort('started_at')}
                  className="px-3 py-2.5 cursor-pointer hover:text-text whitespace-nowrap"
                >
                  Recorded date {renderSortIcon('started_at')}
                </th>
                <th
                  onClick={() => handleSort('duration_s')}
                  className="px-3 py-2.5 cursor-pointer hover:text-text text-right whitespace-nowrap"
                >
                  Duration {renderSortIcon('duration_s')}
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-3 py-2.5 cursor-pointer hover:text-text whitespace-nowrap"
                >
                  Status {renderSortIcon('status')}
                </th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {processedRecordings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">
                    <FileAudio className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
                    <p className="font-medium text-text text-sm">No lectures found</p>
                    <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
                      Record a class with your mobile device or upload an audio recording to transcribe.
                    </p>
                  </td>
                </tr>
              ) : (
                processedRecordings.map((rec) => {
                  const isSelected = selectedIds.has(rec.id);
                  const isCurrent = selectedRecId === rec.id;
                  const isProcessing = rec.status === 'processing' || rec.status === 'queued';

                  return (
                    <tr
                      key={rec.id}
                      onClick={() => onSelectRecording(rec.id)}
                      className={`cursor-pointer transition-colors group ${
                        isCurrent
                          ? 'bg-accent-tint/40'
                          : isSelected
                          ? 'bg-bg/80'
                          : 'hover:bg-bg/50'
                      }`}
                    >
                      <td className="w-10 px-3 py-3 text-center">
                        <button
                          onClick={(e) => toggleSelectRow(rec.id, e)}
                          aria-label={`Select lecture ${rec.subject || rec.id}`}
                          className="text-muted group-hover:text-text inline-flex items-center justify-center"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-accent" />
                          ) : (
                            <Square className="w-3.5 h-3.5 opacity-60" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-3 min-w-[200px]">
                        <div className="font-medium text-text truncate max-w-md">
                          {rec.subject || 'General Lecture Session'}
                        </div>
                        <div className="text-[11px] text-muted font-mono truncate max-w-xs mt-0.5">
                          id: {rec.id.slice(0, 12)}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted font-mono tabular-nums whitespace-nowrap">
                        {formatDate(rec.started_at)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-text whitespace-nowrap">
                        {formatTime(rec.duration_s || 0)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono capitalize border ${
                            rec.status === 'completed'
                              ? 'bg-surface text-text border-border'
                              : isProcessing
                              ? 'bg-accent-tint text-accent border-accent/30'
                              : 'bg-surface text-muted border-border'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectRecording(rec.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-border bg-surface text-text hover:border-accent hover:text-accent transition-colors"
                            title="Open Lecture Details"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Open</span>
                          </button>
                          <button
                            onClick={() => onQueueProcessing(rec.id)}
                            disabled={isProcessing}
                            className="p-1 rounded border border-border bg-surface text-muted hover:text-text hover:border-accent transition-colors disabled:opacity-40"
                            title="Re-run Pipeline"
                            aria-label="Re-run pipeline"
                          >
                            <RotateCw
                              className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin text-accent' : ''}`}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
