import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  BookOpen,
  Calendar,
  HelpCircle,
  Users,
  Repeat,
  CalendarDays,
  Cpu,
  Inbox,
  Smartphone,
  Sun,
  Moon,
  Upload,
  ArrowRight,
  Command,
} from 'lucide-react';
import { NavTab } from './Header';
import { Recording } from '../types';

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: NavTab) => void;
  recordings: Recording[];
  onSelectRecording: (id: string) => void;
  onOpenPairing: () => void;
  onToggleTheme: () => void;
}

export const CommandMenu: React.FC<CommandMenuProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  recordings,
  onSelectRecording,
  onOpenPairing,
  onToggleTheme,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build items list
  const navigationItems: CommandItem[] = [
    {
      id: 'nav-inbox',
      title: 'Go to Library',
      category: 'Navigation',
      icon: <Inbox className="w-4 h-4" />,
      shortcut: 'g l',
      action: () => onSelectTab('inbox'),
    },
    {
      id: 'nav-lecture',
      title: 'Go to Lecture Deep-Dive',
      category: 'Navigation',
      icon: <BookOpen className="w-4 h-4" />,
      shortcut: 'g v',
      action: () => onSelectTab('lecture'),
    },
    {
      id: 'nav-events',
      title: 'Go to Deadlines & Events',
      category: 'Navigation',
      icon: <Calendar className="w-4 h-4" />,
      shortcut: 'g d',
      action: () => onSelectTab('events'),
    },
    {
      id: 'nav-questions',
      title: 'Go to Important Questions (Q&A)',
      category: 'Navigation',
      icon: <HelpCircle className="w-4 h-4" />,
      shortcut: 'g q',
      action: () => onSelectTab('questions'),
    },
    {
      id: 'nav-speakers',
      title: 'Go to Speaker Intelligence',
      category: 'Navigation',
      icon: <Users className="w-4 h-4" />,
      shortcut: 'g s',
      action: () => onSelectTab('speakers'),
    },
    {
      id: 'nav-phrases',
      title: 'Go to Phrases & Habits',
      category: 'Navigation',
      icon: <Repeat className="w-4 h-4" />,
      shortcut: 'g h',
      action: () => onSelectTab('phrases'),
    },
    {
      id: 'nav-timetable',
      title: 'Go to Timetable Schedule',
      category: 'Navigation',
      icon: <CalendarDays className="w-4 h-4" />,
      shortcut: 'g t',
      action: () => onSelectTab('timetable'),
    },
    {
      id: 'nav-corrections',
      title: 'Go to LoRA Studio & Corrections',
      category: 'Navigation',
      icon: <Cpu className="w-4 h-4" />,
      shortcut: 'g c',
      action: () => onSelectTab('corrections'),
    },
  ];

  const lectureItems: CommandItem[] = recordings.map((rec) => ({
    id: `rec-${rec.id}`,
    title: rec.subject || `Lecture ${rec.id.slice(0, 8)}`,
    category: 'Lectures',
    icon: <BookOpen className="w-4 h-4" />,
    action: () => {
      onSelectRecording(rec.id);
      onSelectTab('lecture');
    },
  }));

  const actionItems: CommandItem[] = [
    {
      id: 'act-pair',
      title: 'Pair Google Pixel 8a via USB or Wi-Fi',
      category: 'Actions',
      icon: <Smartphone className="w-4 h-4" />,
      action: onOpenPairing,
    },
    {
      id: 'act-theme',
      title: 'Toggle Color Theme (Dark / Light)',
      category: 'Actions',
      icon: <Sun className="w-4 h-4" />,
      action: onToggleTheme,
    },
  ];

  const allItems = [...navigationItems, ...lectureItems, ...actionItems];

  const filteredItems = query.trim()
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search lectures..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-text placeholder:text-muted focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-surface-elevated border border-border rounded text-muted">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted">
              No matching commands or lectures found
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                    isSelected
                      ? 'bg-accent-tint text-accent font-medium'
                      : 'text-text hover:bg-surface-elevated'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span className={isSelected ? 'text-accent' : 'text-muted'}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.title}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted font-mono uppercase tracking-wider">
                      {item.category}
                    </span>
                    {item.shortcut && (
                      <kbd className="px-1 py-0.5 text-[10px] font-mono bg-surface border border-border rounded text-muted">
                        {item.shortcut}
                      </kbd>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-3 py-2 border-t border-border flex items-center justify-between text-[11px] text-muted bg-surface-elevated font-mono">
          <div className="flex items-center gap-2">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
          </div>
          <span>Lecture Whisper Quick Command</span>
        </div>
      </div>
    </div>
  );
};
