import React from 'react';
import {
  Smartphone,
  Command,
  Inbox,
  BookOpen,
  Calendar,
  HelpCircle as QuestionIcon,
  Users,
  Repeat,
  CalendarDays,
  Cpu,
  Sun,
  Moon,
  Laptop,
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

export type ThemeMode = 'system' | 'light' | 'dark';

interface HeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenPairing: () => void;
  onOpenShortcuts: () => void;
  recordingCount: number;
  upcomingEventsCount: number;
  pairedDeviceCount: number;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenPairing,
  onOpenShortcuts,
  recordingCount,
  upcomingEventsCount,
  pairedDeviceCount,
  theme = 'system',
  onToggleTheme,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'inbox', label: 'Library', icon: <Inbox className="w-3.5 h-3.5" />, badge: recordingCount },
    { id: 'lecture', label: 'Lecture View', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'events', label: 'Deadlines', icon: <Calendar className="w-3.5 h-3.5" />, badge: upcomingEventsCount },
    { id: 'questions', label: 'Q&A', icon: <QuestionIcon className="w-3.5 h-3.5" /> },
    { id: 'speakers', label: 'Speakers', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'phrases', label: 'Habits', icon: <Repeat className="w-3.5 h-3.5" /> },
    { id: 'timetable', label: 'Schedule', icon: <CalendarDays className="w-3.5 h-3.5" /> },
    { id: 'corrections', label: 'LoRA Studio', icon: <Cpu className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-header px-4 lg:px-8 border-b border-border">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 gap-4">
        {/* Brand & Hardware Specs */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-surface border border-border p-1 shadow-sm flex items-center justify-center shrink-0 overflow-hidden">
            <img src="/logo.png" alt="Lecture Whisper" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-text text-[15px]">Lecture Whisper</span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-accent-tint text-accent border border-accent/20 rounded-full">
                Local v1.0
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Local backend active · 127.0.0.1:8420</span>
            </div>
          </div>
        </div>

        {/* Primary Segmented Navigation Rail (Desktop) */}
        <nav className="hidden xl:flex items-center gap-1 bg-bg/80 p-1 rounded-xl border border-border shadow-sm">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-surface text-text shadow-sm border border-border font-semibold'
                    : 'text-muted hover:text-text hover:bg-surface/60'
                }`}
              >
                <span className={isActive ? 'text-accent' : 'text-muted'}>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                      isActive ? 'bg-accent-tint text-accent' : 'bg-surface-elevated text-muted'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Utilities & Quick Actions Suite */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Device Connection Status / Pairing Pill */}
          <button
            onClick={onOpenPairing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-elevated text-text border border-border text-xs font-medium transition-all shadow-sm active:scale-95"
            title="Manage paired Pixel 8a and local ADB sync"
          >
            {pairedDeviceCount > 0 ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="hidden sm:inline font-semibold">Pixel 8a Paired</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-accent" />
                <span className="hidden sm:inline">Pair Pixel 8a</span>
              </>
            )}
          </button>

          {/* Light / Dark / System Theme Toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-elevated text-text border border-border flex items-center justify-center transition-all shadow-sm active:scale-95"
              title={`Theme: ${theme.toUpperCase()} (Click to switch)`}
              aria-label="Toggle Theme Mode"
            >
              {theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500 transition-transform rotate-0" />
              ) : theme === 'dark' ? (
                <Moon className="w-4 h-4 text-accent transition-transform rotate-0" />
              ) : (
                <Laptop className="w-4 h-4 text-muted transition-transform" />
              )}
            </button>
          )}

          {/* Keyboard Shortcuts Modal Trigger */}
          <button
            onClick={(e) => {
              (e.currentTarget as HTMLButtonElement).blur();
              onOpenShortcuts();
            }}
            className="w-8 h-8 rounded-xl bg-surface hover:bg-surface-elevated text-muted hover:text-text border border-border flex items-center justify-center transition-all shadow-sm active:scale-95 focus:outline-none"
            aria-label="Keyboard shortcuts (⌘K or ?)"
          >
            <Command className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Responsive Horizontal Scroll Rail (Tablets / Mobile) */}
      <div className="xl:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-border no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all ${
                isActive
                  ? 'bg-surface text-text font-semibold shadow-sm border border-border'
                  : 'text-muted hover:text-text hover:bg-surface/50'
              }`}
            >
              <span className={isActive ? 'text-accent' : 'text-muted'}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-1.5 text-[10px] rounded-full bg-accent-tint text-accent font-bold">
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
