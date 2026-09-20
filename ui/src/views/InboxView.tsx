import React, { useState } from 'react';
import {
  CalendarDays,
  Table as TableIcon,
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
    <div className="space-y-4">
      {/* Consolidated Single Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div className="inline-flex rounded-lg border border-border bg-surface p-0.5 text-xs self-start sm:self-auto shadow-xs">
          <button
            onClick={() => setSubView('today')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
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
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              subView === 'table'
                ? 'bg-accent text-on-accent'
                : 'text-muted hover:text-text'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>All lectures</span>
            <span className="font-mono tabular-nums opacity-80">({recordings.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="font-mono tabular-nums">{totalHours}h recorded</span>
          {pendingEventsCount > 0 && (
            <>
              <span>•</span>
              <span className="font-medium text-accent">{pendingEventsCount} pending deadlines</span>
            </>
          )}
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
