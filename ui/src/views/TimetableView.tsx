import React, { useState } from 'react';
import {
  CalendarDays,
  Plus,
  Upload,
  Clock,
  MapPin,
  User,
  Trash2,
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  FileImage,
  ChevronRight,
} from 'lucide-react';
import { TimetableSlot } from '../types';

interface TimetableViewProps {
  slots: TimetableSlot[];
  onAddSlot: (slot: Omit<TimetableSlot, 'id'>) => void;
  onDeleteSlot: (id: string) => void;
  onUploadTimetablePhoto?: (file: File) => void;
}

const HOURS = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const TimetableView: React.FC<TimetableViewProps> = ({
  slots,
  onAddSlot,
  onDeleteSlot,
  onUploadTimetablePhoto,
}) => {
  const [showSideSheet, setShowSideSheet] = useState<boolean>(false);
  const [subject, setSubject] = useState<string>('');
  const [weekday, setWeekday] = useState<number>(0);
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('11:30');
  const [room, setRoom] = useState<string>('Auditorium B');
  const [lecturer, setLecturer] = useState<string>('Prof. Alan Turing');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [selectedDayTab, setSelectedDayTab] = useState<number>(0); // For mobile day view

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    onAddSlot({
      subject,
      weekday,
      start_time: startTime,
      end_time: endTime,
      room,
      lecturer,
    });

    setSubject('');
    setShowSideSheet(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUploadTimetablePhoto) {
      setIsUploadingPhoto(true);
      onUploadTimetablePhoto(e.target.files[0]);
      setTimeout(() => setIsUploadingPhoto(false), 2000);
    }
  };

  // Convert "HH:MM" string to minutes from 07:00
  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h - 7) * 60 + (m || 0);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-text">Academic timetable & schedule</h2>
          <p className="text-xs text-muted mt-0.5">
            Synchronized to mobile recorder for automated background recording of scheduled class windows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-surface text-xs font-medium text-text hover:border-accent hover:text-accent cursor-pointer transition-colors">
            <Camera className="w-3.5 h-3.5 text-accent" />
            <span>{isUploadingPhoto ? 'Parsing photo...' : 'Upload timetable photo'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={isUploadingPhoto}
            />
          </label>

          <button
            onClick={() => setShowSideSheet(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-on-accent text-xs font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add class slot</span>
          </button>
        </div>
      </div>

      {/* Mobile Day Selector (<768px) */}
      <div className="flex md:hidden items-center rounded-md border border-border bg-surface p-0.5 text-xs overflow-x-auto">
        {DAYS.map((day, idx) => (
          <button
            key={day}
            onClick={() => setSelectedDayTab(idx)}
            className={`px-3 py-1 rounded font-medium transition-colors shrink-0 ${
              selectedDayTab === idx ? 'bg-accent text-on-accent' : 'text-muted hover:text-text'
            }`}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Desktop Hourly Grid (07:00–19:00) */}
      <div className="rounded-lg border border-border bg-surface overflow-hidden hidden md:block">
        {/* Table Column Headers */}
        <div className="grid grid-cols-6 border-b border-border bg-bg/50 text-xs font-medium text-muted">
          <div className="p-3 border-r border-border text-center font-mono">Time</div>
          {DAYS.map((day) => (
            <div key={day} className="p-3 border-r border-border last:border-r-0 text-center font-semibold text-text">
              {day}
            </div>
          ))}
        </div>

        {/* Hourly Rows Container */}
        <div className="relative">
          {HOURS.map((hour, hIdx) => (
            <div key={hour} className="grid grid-cols-6 border-b border-border min-h-[58px] last:border-b-0">
              {/* Hour Label */}
              <div className="p-2 border-r border-border text-xs font-mono text-muted text-center flex items-center justify-center bg-bg/20 select-none">
                {hour}
              </div>

              {/* Day Cells */}
              {DAYS.map((_, dayIdx) => {
                const daySlots = slots.filter((s) => {
                  if (s.weekday !== dayIdx) return false;
                  const startHour = parseInt(s.start_time.split(':')[0], 10);
                  const targetHour = parseInt(hour.split(':')[0], 10);
                  return startHour === targetHour;
                });

                return (
                  <div key={dayIdx} className="p-1 border-r border-border last:border-r-0 relative min-h-[58px]">
                    {daySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="rounded-md border border-accent/30 bg-accent-tint/60 p-2 text-xs text-text shadow-sm hover:border-accent transition-all group relative"
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <h4 className="font-semibold text-text text-xs leading-snug">{slot.subject}</h4>
                          <button
                            onClick={() => onDeleteSlot(slot.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-muted hover:text-alert transition-opacity"
                            title="Delete slot"
                            aria-label="Delete slot"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] font-mono text-muted tabular-nums">
                          <Clock className="w-3 h-3 text-accent shrink-0" />
                          <span>{slot.start_time} - {slot.end_time}</span>
                        </div>

                        {slot.room && (
                          <div className="flex items-center gap-1 text-[11px] text-muted mt-0.5 truncate">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{slot.room}</span>
                          </div>
                        )}

                        {slot.lecturer && (
                          <div className="flex items-center gap-1 text-[11px] text-muted mt-0.5 truncate">
                            <User className="w-3 h-3 shrink-0" />
                            <span>{slot.lecturer}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Day Cards (<768px) */}
      <div className="block md:hidden space-y-3">
        {slots
          .filter((s) => s.weekday === selectedDayTab)
          .sort((a, b) => a.start_time.localeCompare(b.start_time))
          .map((slot) => (
            <div
              key={slot.id}
              className="rounded-lg border border-border bg-surface p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-accent-tint text-accent border border-accent/20">
                  {slot.start_time} - {slot.end_time}
                </span>
                <button
                  onClick={() => onDeleteSlot(slot.id)}
                  className="p-1 text-muted hover:text-alert"
                  aria-label="Delete slot"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <h4 className="text-sm font-semibold text-text">{slot.subject}</h4>

              <div className="flex items-center gap-4 text-xs text-muted">
                {slot.room && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-accent" />
                    <span>{slot.room}</span>
                  </span>
                )}
                {slot.lecturer && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-accent" />
                    <span>{slot.lecturer}</span>
                  </span>
                )}
              </div>
            </div>
          ))}

        {slots.filter((s) => s.weekday === selectedDayTab).length === 0 && (
          <div className="text-center py-12 rounded-lg border border-border bg-surface p-6 text-xs text-muted">
            No classes scheduled for {DAYS[selectedDayTab]}.
          </div>
        )}
      </div>

      {/* Side-Sheet Schedule Editor (Drawer) */}
      {showSideSheet && (
        <div className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm flex justify-end">
          <div className="bg-surface border-l border-border w-full max-w-md h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-semibold text-text">Add class slot</h3>
                <button
                  onClick={() => setShowSideSheet(false)}
                  className="text-muted hover:text-text p-1"
                  aria-label="Close drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form id="slot-form" onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium text-text mb-1">Subject / course title</label>
                  <input
                    type="text"
                    placeholder="e.g. CS 106B Dynamic Programming"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-bg border border-border rounded-md px-3 py-1.5 text-xs text-text focus:outline-none focus:border-accent"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-text mb-1">Day of week</label>
                  <select
                    value={weekday}
                    onChange={(e) => setWeekday(parseInt(e.target.value, 10))}
                    className="w-full bg-bg border border-border rounded-md px-2 py-1.5 text-xs text-text focus:outline-none focus:border-accent"
                  >
                    {DAYS.map((d, i) => (
                      <option key={d} value={i}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-text mb-1">Start time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-bg border border-border rounded-md px-2 py-1.5 text-xs text-text focus:outline-none focus:border-accent font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-text mb-1">End time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-bg border border-border rounded-md px-2 py-1.5 text-xs text-text focus:outline-none focus:border-accent font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-text mb-1">Classroom / location</label>
                  <input
                    type="text"
                    placeholder="e.g. Auditorium B or Gates 104"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full bg-bg border border-border rounded-md px-3 py-1.5 text-xs text-text focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block font-medium text-text mb-1">Lecturer name</label>
                  <input
                    type="text"
                    placeholder="e.g. Prof. Alan Turing"
                    value={lecturer}
                    onChange={(e) => setLecturer(e.target.value)}
                    className="w-full bg-bg border border-border rounded-md px-3 py-1.5 text-xs text-text focus:outline-none focus:border-accent"
                  />
                </div>
              </form>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setShowSideSheet(false)}
                className="px-3 py-1.5 rounded border border-border text-muted hover:text-text text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="slot-form"
                className="px-3.5 py-1.5 rounded bg-accent text-on-accent font-medium hover:opacity-90 text-xs"
              >
                Save slot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
