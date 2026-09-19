import React from 'react';
import {
  Inbox,
  BookOpen,
  Calendar,
  HelpCircle,
  Users,
  Repeat,
  CalendarDays,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { NavTab } from './Header';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  recordingCount: number;
  upcomingEventsCount: number;
  pairedDeviceCount: number;
  onOpenPairing: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  recordingCount,
  upcomingEventsCount,
  pairedDeviceCount,
  onOpenPairing,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'inbox', label: 'Library', icon: <Inbox className="w-4 h-4 shrink-0" />, badge: recordingCount },
    { id: 'lecture', label: 'Lecture', icon: <BookOpen className="w-4 h-4 shrink-0" /> },
    { id: 'events', label: 'Deadlines', icon: <Calendar className="w-4 h-4 shrink-0" />, badge: upcomingEventsCount },
    { id: 'questions', label: 'Q&A', icon: <HelpCircle className="w-4 h-4 shrink-0" /> },
    { id: 'speakers', label: 'Speakers', icon: <Users className="w-4 h-4 shrink-0" /> },
    { id: 'phrases', label: 'Habits', icon: <Repeat className="w-4 h-4 shrink-0" /> },
    { id: 'timetable', label: 'Schedule', icon: <CalendarDays className="w-4 h-4 shrink-0" /> },
    { id: 'corrections', label: 'LoRA Studio', icon: <Cpu className="w-4 h-4 shrink-0" /> },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 bg-surface border-r border-border transition-all duration-200 ease-in-out z-30 ${
        collapsed ? 'w-14' : 'w-60'
      }`}
      aria-label="Sidebar Navigation"
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-border">
        {!collapsed ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
              <img src="/logo.png" alt="Lecture Whisper" className="w-5 h-5 object-contain" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold tracking-tight text-text truncate">
                Lecture Whisper
              </span>
              <span className="text-[10px] text-muted font-mono truncate">
                v1.0 Beta
              </span>
            </div>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
              <img src="/logo.png" alt="Lecture Whisper" className="w-5 h-5 object-contain" />
            </div>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md text-muted hover:text-text hover:bg-surface-elevated transition-colors"
          title={collapsed ? 'Expand sidebar (⌘[)' : 'Collapse sidebar (⌘[)'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors group relative ${
                isActive
                  ? 'bg-accent-tint text-accent font-semibold'
                  : 'text-muted hover:text-text hover:bg-surface-elevated'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className={isActive ? 'text-accent' : 'text-muted group-hover:text-text'}>
                {item.icon}
              </span>

              {!collapsed && (
                <>
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full tabular-nums ${
                        isActive
                          ? 'bg-accent text-on-accent'
                          : 'bg-surface-elevated text-muted'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Device & Pairing Footer */}
      <div className="p-2 border-t border-border">
        {!collapsed ? (
          <button
            onClick={onOpenPairing}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-surface-elevated hover:bg-border text-xs transition-colors group"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="relative flex h-2 w-2 shrink-0">
                {pairedDeviceCount > 0 ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                )}
              </span>
              <div className="flex flex-col text-left truncate">
                <span className="text-[11px] font-medium text-text truncate">
                  {pairedDeviceCount > 0 ? 'Pixel 8a Paired' : 'No Device Paired'}
                </span>
                <span className="text-[10px] text-muted font-mono truncate">
                  Port 8420 active
                </span>
              </div>
            </div>
            <Smartphone className="w-3.5 h-3.5 text-muted group-hover:text-text shrink-0" />
          </button>
        ) : (
          <button
            onClick={onOpenPairing}
            className="w-full flex justify-center p-2 rounded-lg text-muted hover:text-text hover:bg-surface-elevated transition-colors"
            title={pairedDeviceCount > 0 ? 'Pixel 8a connected' : 'Pair Pixel 8a'}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  pairedDeviceCount > 0 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
          </button>
        )}
      </div>
    </aside>
  );
};
