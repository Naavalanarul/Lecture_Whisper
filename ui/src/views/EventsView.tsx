import React, { useState } from 'react';
import {
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Plus,
  Play,
  Check,
  X,
  Edit2,
  CalendarCheck,
  Tag,
  Quote,
} from 'lucide-react';
import { LectureEvent, EventType } from '../types';
import { formatDate, formatRelative, formatTime, downloadICS } from '../utils/formatters';

interface EventsViewProps {
  events: LectureEvent[];
  onConfirmEvent: (index: number) => void;
  onDismissEvent: (index: number) => void;
  onEditEvent: (index: number, updated: Partial<LectureEvent>) => void;
  onAddEvent: (event: LectureEvent) => void;
  onSeekAudio?: (time: number) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  events,
  onConfirmEvent,
  onDismissEvent,
  onEditEvent,
  onAddEvent,
  onSeekAudio,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventType, setNewEventType] = useState<EventType>('assignment_deadline');
  const [newEventDate, setNewEventDate] = useState<string>('');

  const filtered = events.filter((ev) => {
    if (filter === 'all') return true;
    if (filter === 'review') return ev.needs_review;
    if (filter === 'confirmed') return ev.resolved;
    if (filter === 'exams') return ev.type === 'exam' || ev.type === 'quiz';
    if (filter === 'assignments') return ev.type === 'assignment_deadline';
    return true;
  });

  const needsReviewCount = events.filter((e) => e.needs_review).length;
  const examCount = events.filter((e) => e.type === 'exam' || e.type === 'quiz').length;

  const getTypeStyle = (type: EventType) => {
    switch (type) {
      case 'exam':
        return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
      case 'quiz':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
      case 'assignment_deadline':
        return 'bg-brand-500/10 text-brand-300 border-brand-500/20';
      case 'seminar':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    onAddEvent({
      title: newEventTitle,
      type: newEventType,
      date_iso: newEventDate ? new Date(newEventDate).toISOString() : null,
      date_text: newEventDate || 'Custom date',
      resolved: true,
      confidence: 1.0,
      source_quote: 'Manually scheduled by student',
      start_s: 0,
      needs_review: false,
    });

    setNewEventTitle('');
    setNewEventDate('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card p-5 rounded-2xl border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">Actionable Deadlines & Academic Events</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automatically extracted by MLX-LM and resolved against lecture timestamps
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Deadline</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: `All Events (${events.length})` },
          { id: 'review', label: `Needs Review (${needsReviewCount})`, alert: needsReviewCount > 0 },
          { id: 'confirmed', label: 'Confirmed' },
          { id: 'exams', label: `Exams & Quizzes (${examCount})` },
          { id: 'assignments', label: 'Assignments' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 flex items-center gap-1.5 border transition-all ${
              filter === tab.id
                ? 'bg-brand-600 border-brand-500 text-white font-semibold shadow-md shadow-brand-600/20'
                : 'bg-surface-900 border-white/5 text-slate-400 hover:text-white hover:bg-surface-850'
            }`}
          >
            <span>{tab.label}</span>
            {tab.alert && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 glass-card rounded-2xl border border-white/10">
          <CalendarCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No events match this filter</h3>
          <p className="text-xs text-slate-400 mt-1">All deadlines are organized and up to date.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ev, idx) => {
            const rel = formatRelative(ev.date_iso);
            return (
              <div
                key={idx}
                className={`glass-card rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between hover-glow ${
                  ev.needs_review
                    ? 'border-amber-500/40 bg-amber-950/10'
                    : ev.resolved
                    ? 'border-white/10'
                    : 'border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${getTypeStyle(
                        ev.type
                      )}`}
                    >
                      {ev.type.replace('_', ' ')}
                    </span>

                    {rel && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white font-mono">
                        {rel}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white mb-2 leading-snug">{ev.title}</h4>

                  <div className="space-y-1.5 text-xs text-slate-300 mb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-medium text-slate-200">{formatDate(ev.date_iso)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Tag className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>Confidence: {Math.round(ev.confidence * 100)}%</span>
                    </div>
                  </div>

                  {ev.source_quote && (
                    <div className="p-2.5 bg-surface-950/80 rounded-xl border border-white/5 mb-4 text-[11px] text-slate-400 italic">
                      <Quote className="w-3 h-3 text-brand-400 inline mr-1" />
                      <span>"{ev.source_quote}"</span>
                      {ev.start_s > 0 && onSeekAudio && (
                        <button
                          onClick={() => onSeekAudio(ev.start_s)}
                          className="ml-2 text-brand-400 hover:text-brand-300 not-italic font-mono text-[10px] underline"
                        >
                          jump ({formatTime(ev.start_s)})
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                  {!ev.resolved && (
                    <button
                      onClick={() => onConfirmEvent(idx)}
                      className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm</span>
                    </button>
                  )}

                  <button
                    onClick={() => downloadICS(ev)}
                    className="flex-1 py-1.5 px-3 bg-surface-950 hover:bg-surface-850 text-slate-200 hover:text-white rounded-lg border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    title="Export .ics to Apple Calendar or Google Calendar"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>.ics</span>
                  </button>

                  <button
                    onClick={() => onDismissEvent(idx)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Dismiss event"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Custom Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md glass-card rounded-2xl border border-white/10 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h4 className="text-sm font-bold text-white">Add Academic Deadline</h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Midterm Exam or Problem Set 3"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full bg-surface-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Type</label>
                <select
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value as EventType)}
                  className="w-full bg-surface-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="exam">Midterm / Final Exam</option>
                  <option value="quiz">Pop Quiz</option>
                  <option value="assignment_deadline">Assignment Deadline</option>
                  <option value="seminar">Seminar / Office Hours</option>
                  <option value="other">Other Event</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full bg-surface-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold"
                >
                  Save Deadline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
