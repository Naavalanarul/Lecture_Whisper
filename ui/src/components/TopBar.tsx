import React from 'react';
import {
  Search,
  Command,
  Sun,
  Moon,
  Laptop,
  Menu,
  ChevronRight,
  Wifi,
  Sparkles,
} from 'lucide-react';
import { NavTab, ThemeMode } from './Header';

interface TopBarProps {
  activeTab: NavTab;
  currentLectureTitle?: string;
  onOpenCommandMenu: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onToggleMobileMenu: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  currentLectureTitle,
  onOpenCommandMenu,
  theme,
  onToggleTheme,
  onToggleMobileMenu,
}) => {
  const getTabTitle = (tab: NavTab) => {
    switch (tab) {
      case 'inbox':
        return 'Library';
      case 'lecture':
        return 'Lecture';
      case 'events':
        return 'Deadlines';
      case 'questions':
        return 'Important Questions';
      case 'speakers':
        return 'Speaker Diarization';
      case 'phrases':
        return 'Phrases & Habits';
      case 'timetable':
        return 'Weekly Schedule';
      case 'corrections':
        return 'LoRA Fine-Tuning Studio';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="h-14 bg-surface border-b border-border px-4 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Mobile Drawer Trigger & Breadcrumbs */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface-elevated transition-colors"
          aria-label="Open mobile navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted truncate">
          <span className="font-medium text-text">{getTabTitle(activeTab)}</span>
          {activeTab === 'lecture' && currentLectureTitle && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" />
              <span className="text-text font-semibold truncate">{currentLectureTitle}</span>
            </>
          )}
        </nav>
      </div>

      {/* Global Quick Search (⌘K trigger) & System Utilities */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenCommandMenu}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-border text-muted hover:text-text border border-border text-xs transition-colors shadow-sm"
          aria-label="Open command palette (⌘K or /)"
        >
          <Search className="w-3.5 h-3.5 text-muted" />
          <span className="hidden sm:inline">Search commands & lectures...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-surface border border-border rounded text-muted">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>

        {/* Server Connection Status Chip */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-elevated border border-border text-[11px] text-muted font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>127.0.0.1:8420</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="w-8 h-8 rounded-lg bg-surface hover:bg-surface-elevated text-text border border-border flex items-center justify-center transition-colors shadow-sm"
          title={`Current theme: ${theme} (click to toggle)`}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : theme === 'dark' ? (
            <Moon className="w-4 h-4 text-accent" />
          ) : (
            <Laptop className="w-4 h-4 text-muted" />
          )}
        </button>
      </div>
    </header>
  );
};
