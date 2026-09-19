import React from 'react';
import {
  Inbox,
  BookOpen,
  Calendar,
  CalendarDays,
  MoreHorizontal,
  X,
  HelpCircle,
  Users,
  Repeat,
  Cpu,
  Smartphone,
} from 'lucide-react';
import { NavTab } from './Header';

interface MobileNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
  recordingCount: number;
  upcomingEventsCount: number;
  pairedDeviceCount: number;
  onOpenPairing: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onSelectTab,
  isOpen,
  onClose,
  recordingCount,
  upcomingEventsCount,
  pairedDeviceCount,
  onOpenPairing,
}) => {
  const primaryTabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'inbox', label: 'Library', icon: <Inbox className="w-5 h-5" />, badge: recordingCount },
    { id: 'lecture', label: 'Lecture', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'events', label: 'Deadlines', icon: <Calendar className="w-5 h-5" />, badge: upcomingEventsCount },
    { id: 'timetable', label: 'Schedule', icon: <CalendarDays className="w-5 h-5" /> },
  ];

  const allTabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'inbox', label: 'Library', icon: <Inbox className="w-4 h-4" />, badge: recordingCount },
    { id: 'lecture', label: 'Lecture', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'events', label: 'Deadlines', icon: <Calendar className="w-4 h-4" />, badge: upcomingEventsCount },
    { id: 'questions', label: 'Q&A', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'speakers', label: 'Speakers', icon: <Users className="w-4 h-4" /> },
    { id: 'phrases', label: 'Habits', icon: <Repeat className="w-4 h-4" /> },
    { id: 'timetable', label: 'Schedule', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'corrections', label: 'LoRA Studio', icon: <Cpu className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Fixed Bottom Navigation Bar (Mobile only: md:hidden) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border z-30 flex items-center justify-around px-2"
      >
        {primaryTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 relative ${
                isActive ? 'text-accent font-semibold' : 'text-muted'
              }`}
            >
              <span className="relative">
                {tab.icon}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 text-[9px] font-bold rounded-full bg-accent text-on-accent tabular-nums">
                    {tab.badge}
                  </span>
                )}
              </span>
              <span className="text-[10px]">{tab.label}</span>
            </button>
          );
        })}

        {/* More Drawer Button */}
        <button
          onClick={onClose}
          className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 ${
            ['questions', 'speakers', 'phrases', 'corrections'].includes(activeTab)
              ? 'text-accent font-semibold'
              : 'text-muted'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px]">More</span>
        </button>
      </nav>

      {/* Slide-over Drawer for All Views on Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in"
          onClick={onClose}
        >
          <div
            className="fixed top-0 bottom-0 left-0 w-72 bg-surface border-r border-border p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-surface border border-border p-1 flex items-center justify-center">
                    <img src="/logo.png" alt="Lecture Whisper" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-text">Lecture Whisper</h3>
                    <p className="text-[10px] text-muted font-mono">v1.0 Beta</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded-md text-muted hover:text-text hover:bg-surface-elevated"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {allTabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        onSelectTab(tab.id);
                        onClose();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                        isActive
                          ? 'bg-accent-tint text-accent font-semibold'
                          : 'text-muted hover:text-text hover:bg-surface-elevated'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={isActive ? 'text-accent' : 'text-muted'}>{tab.icon}</span>
                        <span>{tab.label}</span>
                      </div>
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <span
                          className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full tabular-nums ${
                            isActive ? 'bg-accent text-on-accent' : 'bg-surface-elevated text-muted'
                          }`}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Bottom Mobile Drawer Footer */}
            <div className="pt-3 border-t border-border space-y-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenPairing();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-surface-elevated text-xs text-text border border-border"
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-accent" />
                  <span className="font-medium">
                    {pairedDeviceCount > 0 ? 'Pixel 8a Paired' : 'Pair Pixel 8a'}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted">8420</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
