import React, { useState } from 'react';
import {
  CalendarDays,
  Table as TableIcon,
  BookOpen,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { Recording, TimetableSlot, LectureEvent } from '../types';
import { TodayView } from './TodayView';
import { LecturesTableView } from './LecturesTableView';

interface InboxViewProps {
  recordings: Recording[];
  selectedRecId: string | null;
  onSelectRecording: (id: string) => void;
  onQueueProcessing: (id: string) => void;
  onExportNotes?: (rec: Recording) => void;
  onUploadFile?: (file: File) => void;
  timetable?: TimetableSlot[];
  events?: LectureEvent[];
  onNavigateToTab?: (tab: any) => void;
}

export const InboxView: React.FC<InboxViewProps> = ({
  recordings,
  selectedRecId,
  onSelectRecording,
  onQueueProcessing,
  onExportNotes,
  onUploadFile,
  timetable = [],
  events = [],
  onNavigateToTab,
}) => {
  const [subView, setSubView] = useState<'today' | 'table'>('table');

  const totalDuration = recordings.reduce((acc, r) => acc + (r.duration_s || 0), 0);
  const totalHours = (totalDuration / 3600).toFixed(1);
  const pendingEventsCount = events.filter((e) => !e.resolved).length;

  return (
    <div className="space-y-6">
      {/* Top Section: Metrics + Subview Segmented Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        {/* Metric Pills */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-surface text-text">
            <BookOpen className="w-3.5 h-3.5 text-accent" />
            <span className="text-muted">Lectures:</span>
            <span className="font-mono tabular-nums font-semibold">{recordings.length}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-surface text-text">
            <Clock className="w-3.5 h-3.5 text-accent" />
            <span className="text-muted">Recorded:</span>
            <span className="font-mono tabular-nums font-semibold">{totalHours}h</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-surface text-text">
            <Calendar className="w-3.5 h-3.5 text-accent" />
            <span className="text-muted">Pending deadlines:</span>
            <span className="font-mono tabular-nums font-semibold">{pendingEventsCount}</span>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="inline-flex rounded-md border border-border bg-surface p-0.5 text-xs self-start sm:self-auto">
          <button
            onClick={() => setSubView('today')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              subView === 'today'
                ? 'bg-accent text-on-accent'
                : 'text-muted hover:text-text'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Today's overview</span>
          </button>
          <button
            onClick={() => setSubView('table')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
              subView === 'table'
                ? 'bg-accent text-on-accent'
                : 'text-muted hover:text-text'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>All lectures</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {subView === 'today' ? (
        <TodayView
          timetable={timetable}
          events={events}
          recordings={recordings}
          onSelectRecording={onSelectRecording}
          onQueueProcessing={onQueueProcessing}
          onNavigateToTab={onNavigateToTab}
        />
      ) : (
        <LecturesTableView
          recordings={recordings}
          selectedRecId={selectedRecId}
          onSelectRecording={onSelectRecording}
          onQueueProcessing={onQueueProcessing}
          onUploadFile={onUploadFile}
        />
      )}
    </div>
  );
};
