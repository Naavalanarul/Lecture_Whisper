import React from 'react';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
  Sparkles,
  ArrowRight,
  BookOpen,
  Calendar,
  Layers,
} from 'lucide-react';
import { TimetableSlot, LectureEvent, Recording } from '../types';
import { formatTime, formatDate } from '../utils/formatters';

interface TodayViewProps {
  timetable: TimetableSlot[];
  events: LectureEvent[];
  recordings: Recording[];
  onSelectRecording: (id: string) => void;
  onQueueProcessing: (id: string) => void;
  onNavigateToTab?: (tab: any) => void;
}

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const TodayView: React.FC<TodayViewProps> = ({
  timetable,
  events,
  recordings,
  onSelectRecording,
  onQueueProcessing,
  onNavigateToTab,
}) => {
  // Convert JS getDay() (0=Sun, 1=Mon, ..., 6=Sat) to 0=Mon, ..., 6=Sun
  const jsDay = new Date().getDay();
  const todayWeekday = (jsDay + 6) % 7;
  const todayDayName = WEEKDAY_NAMES[todayWeekday];

  // Today's classes from timetable
  const todayClasses = timetable
    .filter((slot) => slot.weekday === todayWeekday)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Deadlines due within next 48 hours
  const now = new Date();
  const next48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const urgentDeadlines = events
    .filter((e) => {
      if (!e.date_iso) return false;
      const d = new Date(e.date_iso);
      return !e.resolved && d >= now && d <= next48h;
    })
    .sort((a, b) => (a.date_iso || '').localeCompare(b.date_iso || ''));

  // Active / processing recordings
  const activeRecordings = recordings.filter(
    (r) => r.status === 'processing' || r.status === 'queued'
  );

  // Recent recordings
  const recentRecordings = [...recordings]
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header section with Wispr Flow editorial serif emphasis */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal tracking-tight text-text">
            Every lecture, <span className="italic text-accent">written down.</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1 font-sans">
            {todayDayName}, {new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {todayClasses.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-accent-tint text-accent border border-accent/20">
              <Clock className="w-3 h-3" />
              <span className="tabular-nums font-mono">{todayClasses.length}</span> classes scheduled
            </span>
          )}
          {urgentDeadlines.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-alert/10 text-alert border border-alert/20">
              <AlertCircle className="w-3 h-3" />
              <span className="tabular-nums font-mono">{urgentDeadlines.length}</span> due soon
            </span>
          )}
        </div>
      </div>

      {/* Active background tasks if any */}
      {activeRecordings.length > 0 && (
        <div className="rounded-lg border border-accent/30 bg-accent-tint/40 p-4">
          <div className="flex items-center gap-2 mb-2 text-accent font-medium text-sm">
            <RotateCw className="w-4 h-4 animate-spin" />
            <span>Active background processing ({activeRecordings.length})</span>
          </div>
          <div className="space-y-2">
            {activeRecordings.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-xs bg-surface p-2.5 rounded-md border border-border"
              >
                <div className="min-w-0">
                  <span className="font-medium text-text">{r.subject || 'Lecture'}</span>
                  <span className="text-muted ml-2 font-mono tabular-nums">({r.chunk_count} chunks)</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono capitalize bg-accent text-on-accent">
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Schedule Timeline & Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-accent" />
              <span>Today's classes</span>
            </h3>
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('timetable')}
                className="text-xs text-muted hover:text-text flex items-center gap-1 transition-colors"
              >
                <span>Full timetable</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {todayClasses.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface p-8 text-center">
              <CalendarDays className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-text">No classes scheduled for {todayDayName}</p>
              <p className="text-xs text-muted mt-1">
                Classes added in your timetable will appear here on their respective days.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayClasses.map((slot) => (
                <div
                  key={slot.id}
                  className="rounded-lg border border-border bg-surface p-4 flex items-start justify-between gap-4 transition-all hover:border-accent/40"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-accent-tint text-accent border border-accent/20">
                        {slot.start_time} - {slot.end_time}
                      </span>
                      <span className="text-xs text-muted">{slot.room || 'Room TBA'}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-text">{slot.subject}</h4>
                    {slot.lecturer && (
                      <p className="text-xs text-muted">Lecturer: {slot.lecturer}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted font-mono tabular-nums shrink-0">
                    {WEEKDAY_NAMES[slot.weekday]}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Recent Lectures Section */}
          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent" />
                <span>Recent lectures</span>
              </h3>
            </div>

            {recentRecordings.length === 0 ? (
              <div className="rounded-lg border border-border bg-surface p-6 text-center text-xs text-muted">
                No recorded lectures yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentRecordings.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-lg border border-border bg-surface p-3.5 space-y-2 hover:border-accent/50 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted mb-1">
                        <span className="font-mono tabular-nums">{formatDate(rec.started_at)}</span>
                        <span className="font-mono tabular-nums">{formatTime(rec.duration_s || 0)}</span>
                      </div>
                      <h5 className="text-sm font-medium text-text truncate">
                        {rec.subject || 'Lecture Session'}
                      </h5>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-[11px] text-muted font-mono capitalize">
                        {rec.status}
                      </span>
                      <button
                        onClick={() => onSelectRecording(rec.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-accent text-on-accent hover:opacity-90 transition-opacity"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Open</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Urgent Deadlines & Quick Actions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <Calendar className="w-4 h-4 text-alert" />
              <span>Due in next 48h</span>
            </h3>
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('events')}
                className="text-xs text-muted hover:text-text flex items-center gap-1 transition-colors"
              >
                <span>All deadlines</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {urgentDeadlines.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface p-6 text-center">
              <CheckCircle2 className="w-6 h-6 text-accent mx-auto mb-2 opacity-60" />
              <p className="text-xs font-medium text-text">No urgent deadlines</p>
              <p className="text-[11px] text-muted mt-0.5">Nothing due in the next 48 hours.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {urgentDeadlines.map((ev, i) => (
                <div
                  key={ev.id || i}
                  className="rounded-lg border border-border bg-surface p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-alert/10 text-alert font-medium">
                      {(ev.type || 'assignment_deadline').replace('_', ' ')}
                    </span>
                    <span className="text-muted font-mono tabular-nums">
                      {ev.date_iso ? formatDate(ev.date_iso) : ev.date_text || 'Date TBA'}
                    </span>
                  </div>
                  <p className="font-medium text-text leading-snug">{ev.title}</p>
                </div>
              ))}
            </div>
          )}

          {/* Quick Summary Card */}
          <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
            <h4 className="text-xs font-semibold text-text">System status</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-muted">
                <span>Total lectures</span>
                <span className="font-mono tabular-nums text-text font-medium">{recordings.length}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Timetable entries</span>
                <span className="font-mono tabular-nums text-text font-medium">{timetable.length}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Pending deadlines</span>
                <span className="font-mono tabular-nums text-text font-medium">
                  {events.filter((e) => !e.resolved).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
