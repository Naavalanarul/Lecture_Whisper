import React from 'react';
import {
  Sparkles,
  Smartphone,
  Command,
  HelpCircle,
  Inbox,
  BookOpen,
  Calendar,
  HelpCircle as QuestionIcon,
  Users,
  Repeat,
  CalendarDays,
  Cpu,
} from 'lucide-react';

export type NavTab =
  | 'inbox'
  | 'lecture'
  | 'events'
  | 'questions'
  | 'speakers'
  | 'phrases'
  | 'timetable'
  | 'corrections';

interface HeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenPairing: () => void;
  onOpenShortcuts: () => void;
  recordingCount: number;
  upcomingEventsCount: number;
  pairedDeviceCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenPairing,
  onOpenShortcuts,
  recordingCount,
  upcomingEventsCount,
  pairedDeviceCount,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'inbox', label: 'Library', icon: <Inbox className="w-4 h-4" />, badge: recordingCount },
    { id: 'lecture', label: 'Lecture View', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'events', label: 'Deadlines & Events', icon: <Calendar className="w-4 h-4" />, badge: upcomingEventsCount },
    { id: 'questions', label: 'Important Q&A', icon: <QuestionIcon className="w-4 h-4" /> },
    { id: 'speakers', label: 'Speaker Intel', icon: <Users className="w-4 h-4" /> },
    { id: 'phrases', label: 'Habits & Emphasis', icon: <Repeat className="w-4 h-4" /> },
    { id: 'timetable', label: 'Schedule', icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'corrections', label: 'LoRA Studio', icon: <Cpu className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-header px-4 lg:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 gap-4">
        {/* Brand & Local Specs */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 p-0.5 shadow-lg shadow-brand-500/20">
            <div className="w-full h-full bg-surface-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">Lecture Whisper</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded">
                v1.0 Local
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Apple Silicon M4 Max · 36GB Unified</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden xl:flex items-center gap-1 bg-surface-900/80 p-1 rounded-xl border border-white/5 shadow-inner">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 relative ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-semibold rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-surface-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Secondary Actions & Shortcuts */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenPairing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-900 hover:bg-surface-850 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-all shadow-sm active:scale-95"
            title="Pair Google Pixel 8a or view paired devices"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">
              {pairedDeviceCount > 0 ? `${pairedDeviceCount} Device Paired` : 'Pair Pixel 8a'}
            </span>
          </button>

          <button
            onClick={onOpenShortcuts}
            className="w-8 h-8 rounded-lg bg-surface-900 hover:bg-surface-850 text-slate-400 hover:text-white border border-white/10 flex items-center justify-center transition-all text-xs"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            <Command className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile/Tablet Horizontal Scrollable Tab Bar */}
      <div className="xl:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-white/5 no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all ${
                isActive
                  ? 'bg-brand-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-1.5 text-[10px] rounded-full bg-white/20 text-white">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
