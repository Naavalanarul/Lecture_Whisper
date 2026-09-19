import React from 'react';
import { Command, X } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      category: 'Audio Playback',
      items: [
        { key: 'Space', desc: 'Toggle Play / Pause' },
        { key: 'J / ←', desc: 'Rewind 10 seconds' },
        { key: 'L / →', desc: 'Forward 10 seconds' },
        { key: 'M', desc: 'Mute / Unmute audio' },
        { key: '[ / ]', desc: 'Decrease / Increase playback speed' },
      ],
    },
    {
      category: 'Quick View Navigation',
      items: [
        { key: '1', desc: 'Inbox / Lecture Library' },
        { key: '2', desc: 'Lecture Audio & Synced Notes' },
        { key: '3', desc: 'Deadlines & Events Calendar' },
        { key: '4', desc: 'Important Questions Q&A' },
        { key: '5', desc: 'Speaker Diarization Intel' },
        { key: '6', desc: 'Repeated Phrases & Habits' },
        { key: '7', desc: 'Weekly Timetable Schedule' },
        { key: '8', desc: 'LoRA Studio & Training' },
      ],
    },
    {
      category: 'General & Actions',
      items: [
        { key: '?', desc: 'Show this keyboard shortcuts guide' },
        { key: 'Esc', desc: 'Close open modals or search' },
        { key: '⌘ / Ctrl + K', desc: 'Search lectures and transcript' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl glass-card rounded-2xl border border-white/10 shadow-2xl p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2">
            <Command className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {shortcutGroups.map((grp, idx) => (
            <div key={idx}>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                {grp.category}
              </h4>
              <div className="space-y-1.5">
                {grp.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="flex items-center justify-between p-2 rounded-lg bg-surface-950/60 border border-white/5 text-xs"
                  >
                    <span className="text-slate-300 font-medium">{item.desc}</span>
                    <kbd className="px-2 py-1 bg-surface-900 border border-white/10 rounded font-mono text-[11px] text-slate-200 shadow-sm font-semibold">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
