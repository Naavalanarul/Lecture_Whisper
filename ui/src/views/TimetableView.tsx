import React, { useState } from 'react';
import {
  CalendarDays,
  Plus,
  Upload,
  Clock,
  MapPin,
  User,
  Trash2,
  Sparkles,
  Camera,
  X,
  CheckCircle2,
} from 'lucide-react';
import { TimetableSlot } from '../types';

interface TimetableViewProps {
  slots: TimetableSlot[];
  onAddSlot: (slot: Omit<TimetableSlot, 'id'>) => void;
  onDeleteSlot: (id: string) => void;
  onUploadTimetablePhoto?: (file: File) => void;
}

export const TimetableView: React.FC<TimetableViewProps> = ({
  slots,
  onAddSlot,
  onDeleteSlot,
  onUploadTimetablePhoto,
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [subject, setSubject] = useState<string>('');
  const [weekday, setWeekday] = useState<number>(0);
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('11:30');
  const [room, setRoom] = useState<string>('Auditorium B');
  const [lecturer, setLecturer] = useState<string>('Prof. Alan Turing');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const getSubjectColor = (subj: string) => {
    if (subj.includes('CS')) return 'bg-brand-600/20 border-brand-500/40 text-brand-200';
    if (subj.includes('MATH')) return 'bg-cyan-600/20 border-cyan-500/40 text-cyan-200';
    if (subj.includes('EE') || subj.includes('PHYS')) return 'bg-amber-600/20 border-amber-500/40 text-amber-200';
    return 'bg-purple-600/20 border-purple-500/40 text-purple-200';
  };

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
    setShowAddModal(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUploadTimetablePhoto) {
      setIsUploadingPhoto(true);
      onUploadTimetablePhoto(e.target.files[0]);
      setTimeout(() => setIsUploadingPhoto(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">Academic Schedule & Timetable</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Pixel 8a recorder automatically schedules background recordings around these active lecture windows
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="px-3 py-2 bg-surface-900 hover:bg-surface-850 text-slate-200 hover:text-white rounded-xl border border-white/10 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95">
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isUploadingPhoto ? 'Parsing with MLX-VLM...' : 'Upload Timetable Photo'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={isUploadingPhoto}
            />
          </label>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Class Slot</span>
          </button>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {days.map((dayName, dayIndex) => {
          const daySlots = slots.filter((s) => s.weekday === dayIndex);

          return (
            <div
              key={dayIndex}
              className="glass-card rounded-2xl border border-white/10 p-4 space-y-3 flex flex-col min-h-[380px]"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {dayName}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {daySlots.length} {daySlots.length === 1 ? 'class' : 'classes'}
                </span>
              </div>

              {daySlots.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <p className="text-xs text-slate-600">No classes scheduled</p>
                </div>
              ) : (
                <div className="space-y-2.5 flex-1">
                  {daySlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between group ${getSubjectColor(
                        slot.subject
                      )}`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <h4 className="text-xs font-bold leading-tight truncate">{slot.subject}</h4>
                          <button
                            onClick={() => onDeleteSlot(slot.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-400 transition-opacity"
                            title="Delete slot"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] opacity-80 mb-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span className="font-mono">
                            {slot.start_time} - {slot.end_time}
                          </span>
                        </div>

                        {slot.room && (
                          <div className="flex items-center gap-1 text-[11px] opacity-75 truncate">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{slot.room}</span>
                          </div>
                        )}
                      </div>

                      {slot.lecturer && (
                        <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center gap-1 text-[10px] opacity-70 truncate">
                          <User className="w-3 h-3 shrink-0" />
                          <span>{slot.lecturer}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Slot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md glass-card rounded-2xl border border-white/10 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <h4 className="text-sm font-bold text-white">Add Recurring Lecture Slot</h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Subject / Course Code</label>
                <input
                  type="text"
                  placeholder="e.g. CS 106B Dynamic Programming"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-surface-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Weekday</label>
                <select
                  value={weekday}
                  onChange={(e) => setWeekday(parseInt(e.target.value))}
                  className="w-full bg-surface-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  {days.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-surface-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-surface-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Room / Hall</label>
                  <input
                    type="text"
                    placeholder="e.g. Gates B01"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full bg-surface-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Lecturer</label>
                  <input
                    type="text"
                    placeholder="e.g. Prof. Alan Turing"
                    value={lecturer}
                    onChange={(e) => setLecturer(e.target.value)}
                    className="w-full bg-surface-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
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
                  Save Class Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
