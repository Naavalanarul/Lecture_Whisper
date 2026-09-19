import React, { useState, useMemo } from 'react';
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
  CalendarCheck,
  Tag,
  Quote,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { LectureEvent, EventType } from '../types';
import { formatDate, formatTime, downloadICS, downloadAllICS } from '../utils/formatters';

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
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventType, setNewEventType] = useState<EventType>('assignment_deadline');
  const [newEventDate, setNewEventDate] = useState<string>('');

  // Group events temporally
  const now = new Date();
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (filterType === 'all') return true;
      if (filterType === 'review') return ev.needs_review;
      if (filterType === 'confirmed') return ev.resolved;
      if (filterType === 'exams') return ev.type === 'exam' || ev.type === 'quiz';
      if (filterType === 'assignments') return ev.type === 'assignment_deadline';
      return true;
    });
  }, [events, filterType]);

  const groups = useMemo(() => {
    const thisWeek: { event: LectureEvent; index: number }[] = [];
    const nextWeek: { event: LectureEvent; index: number }[] = [];
    const later: { event: LectureEvent; index: number }[] = [];
    const past: { event: LectureEvent; index: number }[] = [];

    filteredEvents.forEach((ev) => {
      const originalIndex = events.indexOf(ev);
      if (!ev.date_iso) {
        later.push({ event: ev, index: originalIndex });
        return;
      }
      const d = new Date(ev.date_iso);
      if (d < now && !ev.needs_review) {
        past.push({ event: ev, index: originalIndex });
      } else if (d <= oneWeekLater) {
        thisWeek.push({ event: ev, index: originalIndex });
      } else if (d <= twoWeeksLater) {
        nextWeek.push({ event: ev, index: originalIndex });
      } else {
        later.push({ event: ev, index: originalIndex });
      }
    });

    return { thisWeek, nextWeek, later, past };
  }, [filteredEvents, events, now, oneWeekLater, twoWeeksLater]);

  const needsReviewCount = events.filter((e) => e.needs_review).length;
  const confirmedCount = events.filter((e) => e.resolved).length;

  const handleResolveCandidate = (evIndex: number, chosenDate: string) => {
    onEditEvent(evIndex, {
      date_iso: chosenDate,
      date_text: formatDate(chosenDate),
      needs_review: false,
      resolved: true,
    });
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    onAddEvent({
      title: newEventTitle,
      type: newEventType,
      date_iso: newEventDate ? new Date(newEventDate).toISOString() : null,
      date_text: newEventDate ? formatDate(newEventDate) : 'Custom date',
      resolved: true,
      confidence: 1.0,
      source_quote: 'Manually added by student',
      start_s: 0,
      needs_review: false,
    });

    setNewEventTitle('');
    setNewEventDate('');
    setShowAddModal(false);
  };

  const renderEventCard = ({ event: ev, index: evIndex }: { event: LectureEvent; index: number }) => {
    const isUrgent = ev.needs_review || (ev.date_iso && new Date(ev.date_iso) <= oneWeekLater);

    return (
      <div
        key={ev.id || evIndex}
        className={`rounded-lg border bg-surface p-4 transition-all flex flex-col justify-between gap-3 ${
          ev.needs_review
            ? 'border-alert/50 ring-1 ring-alert/20'
            : ev.resolved
            ? 'border-border'
            : 'border-border hover:border-accent/40'
        }`}
      >
        <div>
          {/* Top meta row */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono capitalize border border-border bg-bg text-text">
                {ev.type.replace('_', ' ')}
              </span>
              {ev.needs_review ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-alert">
                  <AlertCircle className="w-3 h-3" />
                  <span>Needs date review</span>
                </span>
              ) : ev.resolved ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Confirmed</span>
                </span>
              ) : null}
            </div>

            <span className="text-xs font-mono tabular-nums text-muted">
              {ev.date_iso ? formatDate(ev.date_iso) : ev.date_text || 'Date TBA'}
            </span>
          </div>

          <h4 className="text-sm font-semibold text-text leading-snug mb-2">{ev.title}</h4>

          {/* Transcript Quote */}
          {ev.source_quote && (
            <div className="rounded bg-bg p-2.5 text-xs text-muted border border-border mb-3 flex items-start gap-2">
              <Quote className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
              <p className="italic leading-relaxed">"{ev.source_quote}"</p>
            </div>
          )}

          {/* Candidate Dates Disambiguation Interface (Section A1 Parity) */}
          {ev.needs_review && ev.candidate_dates && ev.candidate_dates.length > 0 && (
            <div className="rounded-md border border-alert/30 bg-alert/5 p-3 mb-3 space-y-2">
              <p className="text-xs font-medium text-alert flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Multiple date interpretations detected:</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {ev.candidate_dates.map((candidate, cIdx) => (
                  <button
                    key={cIdx}
                    onClick={() => handleResolveCandidate(evIndex, candidate)}
                    className="px-2.5 py-1 text-xs font-mono rounded border border-border bg-surface text-text hover:border-accent hover:text-accent transition-colors flex items-center gap-1"
                  >
                    <span>{formatDate(candidate)}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
          <div className="flex items-center gap-2">
            {ev.start_s !== undefined && ev.start_s > 0 && onSeekAudio && (
              <button
                onClick={() => onSeekAudio(ev.start_s)}
                className="inline-flex items-center gap-1 text-muted hover:text-accent transition-colors"
                title="Listen to lecture context"
              >
                <Play className="w-3 h-3 fill-current" />
                <span className="font-mono tabular-nums">{formatTime(ev.start_s)}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {!ev.resolved && (
              <button
                onClick={() => onConfirmEvent(evIndex)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-accent text-on-accent text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <Check className="w-3 h-3" />
                <span>Confirm</span>
              </button>
            )}
            <button
              onClick={() => downloadICS(ev)}
              className="p-1.5 rounded border border-border hover:border-accent hover:text-accent text-muted transition-colors"
              title="Download .ics event"
              aria-label="Download calendar event"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDismissEvent(evIndex)}
              className="p-1.5 rounded border border-border hover:border-alert hover:text-alert text-muted transition-colors"
              title="Dismiss deadline"
              aria-label="Dismiss deadline"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text">Deadlines & events</h2>
          <p className="text-xs text-muted mt-0.5">
            Academic milestones, homework deadlines, and exams extracted from lecture speech.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {events.length > 0 && (
            <button
              onClick={() => downloadAllICS(events)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface text-xs font-medium text-text hover:border-accent hover:text-accent transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-accent" />
              <span>Export all (.ics)</span>
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-on-accent text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add deadline</span>
          </button>
        </div>
      </div>

      {/* Filter Segmented Controls */}
      <div className="inline-flex rounded-md border border-border bg-surface p-0.5 text-xs">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1 rounded font-medium transition-colors ${
            filterType === 'all' ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'
          }`}
        >
          All ({events.length})
        </button>
        <button
          onClick={() => setFilterType('review')}
          className={`px-3 py-1 rounded font-medium transition-colors ${
            filterType === 'review' ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'
          }`}
        >
          Needs review ({needsReviewCount})
        </button>
        <button
          onClick={() => setFilterType('confirmed')}
          className={`px-3 py-1 rounded font-medium transition-colors ${
            filterType === 'confirmed' ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'
          }`}
        >
          Confirmed ({confirmedCount})
        </button>
        <button
          onClick={() => setFilterType('exams')}
          className={`px-3 py-1 rounded font-medium transition-colors ${
            filterType === 'exams' ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'
          }`}
        >
          Exams & quizzes
        </button>
        <button
          onClick={() => setFilterType('assignments')}
          className={`px-3 py-1 rounded font-medium transition-colors ${
            filterType === 'assignments' ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'
          }`}
        >
          Assignments
        </button>
      </div>

      {/* Structured Temporal Agenda */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-20 rounded-lg border border-border bg-surface p-6">
          <Calendar className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-text">No deadlines found</h3>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            When lecturers mention upcoming assignments, quizzes, or schedule shifts, they are automatically structured here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* This Week */}
          {groups.thisWeek.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Clock className="w-4 h-4 text-alert" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text">This week</h3>
                <span className="text-xs font-mono tabular-nums text-muted">({groups.thisWeek.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.thisWeek.map(renderEventCard)}
              </div>
            </div>
          )}

          {/* Next Week */}
          {groups.nextWeek.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <CalendarCheck className="w-4 h-4 text-accent" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text">Next week</h3>
                <span className="text-xs font-mono tabular-nums text-muted">({groups.nextWeek.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.nextWeek.map(renderEventCard)}
              </div>
            </div>
          )}

          {/* Later This Term */}
          {groups.later.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Calendar className="w-4 h-4 text-muted" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text">Later this term</h3>
                <span className="text-xs font-mono tabular-nums text-muted">({groups.later.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.later.map(renderEventCard)}
              </div>
            </div>
          )}

          {/* Past / Resolved */}
          {groups.past.length > 0 && (
            <div className="space-y-3 opacity-75">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <CheckCircle2 className="w-4 h-4 text-muted" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Past / archived</h3>
                <span className="text-xs font-mono tabular-nums text-muted">({groups.past.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.past.map(renderEventCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Deadline Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-semibold text-text">Add custom deadline</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted hover:text-text p-1"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-text mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. CS 106B Midterm Examination"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full bg-bg border border-border rounded-md px-3 py-1.5 text-xs text-text focus:outline-none focus:border-accent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-text mb-1">Event type</label>
                  <select
                    value={newEventType}
                    onChange={(e) => setNewEventType(e.target.value as EventType)}
                    className="w-full bg-bg border border-border rounded-md px-2 py-1.5 text-xs text-text focus:outline-none focus:border-accent"
                  >
                    <option value="assignment_deadline">Assignment</option>
                    <option value="exam">Exam</option>
                    <option value="quiz">Quiz</option>
                    <option value="seminar">Seminar</option>
                    <option value="project">Project</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-text mb-1">Due date</label>
                  <input
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full bg-bg border border-border rounded-md px-2 py-1.5 text-xs text-text focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded border border-border text-muted hover:text-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-accent text-on-accent font-medium hover:opacity-90"
                >
                  Save deadline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
