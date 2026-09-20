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
      category: 'Floating Navigation',
      items: [
        { key: 'g h', desc: 'Navigate to Home' },
        { key: 'g l', desc: 'Navigate to Lectures' },
        { key: 'g d', desc: 'Navigate to Deadlines' },
        { key: 'g i', desc: 'Navigate to Insights' },
        { key: 'g s', desc: 'Navigate to Schedule' },
      ],
    },
    {
      category: 'Command & Search',
      items: [
        { key: '⌘ / Ctrl + K', desc: 'Search lectures, events and transcripts' },
        { key: '⌘ / Ctrl + ,', desc: 'Open Settings and shortcuts' },
        { key: '?', desc: 'Toggle keyboard shortcuts guide' },
        { key: 'Esc', desc: 'Close dialog or sheet' },
      ],
    },
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
      category: 'Direct Views',
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
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard Shortcuts"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent text-on-accent flex items-center justify-center">
              <Command className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text">Keyboard Shortcuts</h3>
              <p className="text-xs text-muted">Quick navigation & playback controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-muted hover:text-text transition-colors focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Close shortcuts"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
          {shortcutGroups.map((grp, idx) => (
            <div key={idx}>
              <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">
                {grp.category}
              </h4>
              <div className="space-y-1.5">
                {grp.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-surface-subtle border border-border/70 text-xs"
                  >
                    <span className="text-text font-medium">{item.desc}</span>
                    <kbd className="px-2 py-1 bg-surface border border-border rounded-md font-mono text-[11px] text-text shadow-xs font-semibold">
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

export default ShortcutsModal;
