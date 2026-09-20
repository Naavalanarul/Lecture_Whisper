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
  CheckSquare,
  Square,
  Upload,
  FileAudio,
  Info,
  Copy,
  Check,
  X,
} from 'lucide-react';
import { Recording } from '../types';
import { formatTime, formatDate, copyToClipboard } from '../utils/formatters';

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
  const [detailsRec, setDetailsRec] = useState<Recording | null>(null);
  const [copiedId, setCopiedId] = useState(false);

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
        const titleMatch = (r.subject || 'Lecture').toLowerCase().includes(searchTerm.toLowerCase());
        const idMatch = r.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSearch = titleMatch || idMatch;

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
        let valA = a[sortField] || (a as any).created_at;
        let valB = b[sortField] || (b as any).created_at;

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

  const formatRecordingDateTime = (rec: Recording) => {
    const rawDate = rec.started_at || (rec as any).created_at;
    if (!rawDate) return { date: 'Not linked to a class', time: '' };
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return { date: rawDate, time: '' };
      return {
        date: d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        time: d.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }),
      };
    } catch {
      return { date: rawDate, time: '' };
    }
  };

  const handleCopyId = async (id: string) => {
    await copyToClipboard(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1600);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar (min-w-[280px] flexible with full visible placeholder) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1">
          {/* Flexible search field with at least 280px min-width */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title, course, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-text placeholder:text-muted focus:outline-none focus:border-accent shadow-xs transition-colors"
            />
          </div>

          {distinctSubjects.length > 0 && (
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-text focus:outline-none focus:border-accent shrink-0 shadow-xs cursor-pointer"
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

        <div className="flex items-center gap-2.5 justify-between sm:justify-end shrink-0">
          {/* Status Pills */}
          <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-xs shadow-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-accent text-on-accent'
                  : 'text-muted hover:text-text'
              }`}
            >
              All ({recordings.length})
            </button>
            <button
              onClick={() => setStatusFilter('ready')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === 'ready'
                  ? 'bg-accent text-on-accent'
                  : 'text-muted hover:text-text'
              }`}
            >
              Ready
            </button>
            <button
              onClick={() => setStatusFilter('processing')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === 'processing'
                  ? 'bg-accent text-on-accent'
                  : 'text-muted hover:text-text'
              }`}
            >
              Processing
            </button>
          </div>

          {/* Upload Audio Button */}
          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent text-on-accent rounded-lg text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity shrink-0 shadow-xs">
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
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-accent-tint border border-accent/30 rounded-lg text-xs text-accent shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <span className="font-mono tabular-nums font-semibold">{selectedIds.size}</span>
            <span>lectures selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchQueue}
              className="px-3 py-1.5 rounded-md bg-accent text-on-accent font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              <RotateCw className="w-3 h-3" />
              <span>Queue processing</span>
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-2.5 py-1.5 text-muted hover:text-text"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Dense Table with Clean Typography and Details Popover */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-bg/60 text-muted font-medium select-none">
                <th className="w-10 px-3.5 py-3 text-center">
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
                  className="px-3.5 py-3 cursor-pointer hover:text-text"
                >
                  Course & Lecture {renderSortIcon('subject')}
                </th>
                <th
                  onClick={() => handleSort('started_at')}
                  className="px-3.5 py-3 cursor-pointer hover:text-text whitespace-nowrap"
                >
                  Recorded Date & Time {renderSortIcon('started_at')}
                </th>
                <th
                  onClick={() => handleSort('duration_s')}
                  className="px-3.5 py-3 cursor-pointer hover:text-text text-right whitespace-nowrap"
                >
                  Duration {renderSortIcon('duration_s')}
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-3.5 py-3 cursor-pointer hover:text-text whitespace-nowrap"
                >
                  Status {renderSortIcon('status')}
                </th>
                <th className="px-3.5 py-3 text-right">Actions</th>
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
                  const dt = formatRecordingDateTime(rec);

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
                      <td className="w-10 px-3.5 py-3.5 text-center">
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
                      <td className="px-3.5 py-3.5 min-w-[220px]">
                        <div className="font-medium text-text truncate max-w-md">
                          {rec.subject || 'General Lecture Session'}
                        </div>
                        <div className="text-[11px] text-muted truncate max-w-xs mt-0.5">
                          {rec.subject ? 'Academic Lecture' : 'Not linked to a class'}
                        </div>
                      </td>
                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <div className="font-mono tabular-nums text-text">{dt.date}</div>
                        {dt.time && (
                          <div className="text-[11px] text-muted font-mono tabular-nums mt-0.5">{dt.time}</div>
                        )}
                      </td>
                      <td className="px-3.5 py-3.5 text-right font-mono tabular-nums text-text whitespace-nowrap">
                        {formatTime(rec.duration_s || 0)}
                      </td>
                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono capitalize border ${
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
                      <td className="px-3.5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onSelectRecording(rec.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-surface text-text hover:border-accent hover:text-accent transition-colors shadow-xs"
                            title="Open Lecture Details"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Open</span>
                          </button>
                          <button
                            onClick={() => setDetailsRec(rec)}
                            className="p-1.5 rounded-md border border-border bg-surface text-muted hover:text-text hover:border-accent transition-colors shadow-xs"
                            title="View Technical Details & Metadata"
                            aria-label="View recording details"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onQueueProcessing(rec.id)}
                            disabled={isProcessing}
                            className="p-1.5 rounded-md border border-border bg-surface text-muted hover:text-text hover:border-accent transition-colors disabled:opacity-40 shadow-xs"
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

      {/* Details Popover Modal */}
      {detailsRec && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="details-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setDetailsRec(null)}
        >
          <div
            className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-accent" />
                <h3 id="details-modal-title" className="font-semibold text-text text-sm">
                  Lecture Details & Metadata
                </h3>
              </div>
              <button
                onClick={() => setDetailsRec(null)}
                className="w-7 h-7 rounded-full bg-surface-subtle hover:bg-surface-elevated text-muted hover:text-text flex items-center justify-center transition-colors"
                aria-label="Close details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-muted font-medium">Recording ID</label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-text bg-surface-subtle border border-border px-2 py-1 rounded flex-1 truncate select-all">
                    {detailsRec.id}
                  </span>
                  <button
                    onClick={() => handleCopyId(detailsRec.id)}
                    className="p-1.5 rounded border border-border bg-surface hover:bg-surface-elevated text-muted hover:text-text transition-colors flex items-center gap-1"
                    title="Copy full ID"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-muted font-medium">Course / Title</label>
                <div className="text-text font-medium mt-0.5">
                  {detailsRec.subject || 'General Lecture Session (Unlinked)'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted font-medium">Recorded Date</label>
                  <div className="text-text font-mono mt-0.5">
                    {formatRecordingDateTime(detailsRec).date}
                  </div>
                </div>
                <div>
                  <label className="text-muted font-medium">Recorded Time</label>
                  <div className="text-text font-mono mt-0.5">
                    {formatRecordingDateTime(detailsRec).time || '—'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted font-medium">Duration</label>
                  <div className="text-text font-mono mt-0.5">
                    {formatTime(detailsRec.duration_s || 0)}
                  </div>
                </div>
                <div>
                  <label className="text-muted font-medium">Pipeline Status</label>
                  <div className="text-text font-mono capitalize mt-0.5">
                    {detailsRec.status}
                  </div>
                </div>
              </div>

              {detailsRec.sha256 && (
                <div>
                  <label className="text-muted font-medium">SHA-256 Checksum</label>
                  <div className="font-mono text-[11px] text-muted bg-surface-subtle border border-border px-2 py-1 rounded truncate mt-1">
                    {detailsRec.sha256}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <button
                onClick={() => setDetailsRec(null)}
                className="px-4 py-2 rounded-lg bg-surface-subtle hover:bg-surface-elevated text-text text-xs font-semibold transition-colors border border-border"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
