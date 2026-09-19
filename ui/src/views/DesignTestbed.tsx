import React from 'react';
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  BookOpen,
  HelpCircle,
  Inbox,
  Play,
  Download,
  Plus,
} from 'lucide-react';

export const DesignTestbed: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-10 py-6">
      {/* Introduction */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text">Design System Testbed</h1>
        <p className="text-xs text-muted mt-1">
          Strict 2-hue constraint (Neutral + Accent + Alert), hairline borders, tabular numerals, sentence case.
        </p>
      </div>

      {/* 1. Color Palette Tokens */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text uppercase tracking-wider text-muted">
          1. Color Palette Tokens
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl border border-border bg-bg flex flex-col justify-between h-24">
            <span className="text-xs font-mono text-muted">--bg</span>
            <span className="text-xs font-semibold text-text">Background</span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-surface flex flex-col justify-between h-24">
            <span className="text-xs font-mono text-muted">--surface</span>
            <span className="text-xs font-semibold text-text">Surface</span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-accent text-on-accent flex flex-col justify-between h-24">
            <span className="text-xs font-mono opacity-80">--accent</span>
            <span className="text-xs font-semibold">Primary Accent</span>
          </div>
          <div className="p-4 rounded-xl border border-border bg-alert text-white flex flex-col justify-between h-24">
            <span className="text-xs font-mono opacity-80">--alert</span>
            <span className="text-xs font-semibold">Critical Alert</span>
          </div>
        </div>
      </section>

      {/* 2. Typography & Tabular Figures */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text uppercase tracking-wider text-muted">
          2. Typography & Tabular Numerals
        </h2>
        <div className="p-5 rounded-xl border border-border bg-surface space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2 text-xs">
            <span className="text-muted">Standard Sentence-Case Heading</span>
            <span className="text-text font-semibold">Dynamic programming and memoization</span>
          </div>
          <div className="flex items-center justify-between border-b border-border pb-2 text-xs">
            <span className="text-muted">Tabular Timestamps (Monospace alignment)</span>
            <span className="font-mono tabular-nums text-text">01:24:35 / 01:57:00 (148 WPM)</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Diarization Percentage Sum</span>
            <span className="font-mono tabular-nums text-text">85.2% + 14.8% = 100.0%</span>
          </div>
        </div>
      </section>

      {/* 3. Buttons & Interactive States */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text uppercase tracking-wider text-muted">
          3. Button Variants
        </h2>
        <div className="flex flex-wrap gap-3 items-center p-5 rounded-xl border border-border bg-surface">
          <button className="px-3 py-1.5 rounded-lg bg-accent text-on-accent text-xs font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all">
            Primary Action
          </button>
          <button className="px-3 py-1.5 rounded-lg bg-surface border border-border text-text hover:bg-surface-elevated text-xs font-medium shadow-sm active:scale-95 transition-all">
            Secondary Surface
          </button>
          <button className="px-3 py-1.5 rounded-lg bg-accent-tint text-accent text-xs font-semibold hover:opacity-90 active:scale-95 transition-all">
            Accent Tint
          </button>
          <button className="px-3 py-1.5 rounded-lg border border-alert text-alert hover:bg-alert/10 text-xs font-semibold active:scale-95 transition-all">
            Destructive Action
          </button>
          <button
            disabled
            className="px-3 py-1.5 rounded-lg bg-surface-elevated text-muted text-xs font-medium opacity-50 cursor-not-allowed"
          >
            Disabled Button
          </button>
        </div>
      </section>

      {/* 4. Badges & Chips */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text uppercase tracking-wider text-muted">
          4. Semantic Badges & Chips
        </h2>
        <div className="flex flex-wrap gap-2.5 p-5 rounded-xl border border-border bg-surface">
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-tint text-accent border border-accent/20">
            Key concept
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-elevated text-text border border-border">
            Assignment deadline
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-alert/10 text-alert border border-alert/20">
            Midterm exam
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono text-muted bg-surface border border-border">
            127.0.0.1:8420
          </span>
        </div>
      </section>

      {/* 5. Empty State Pattern */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text uppercase tracking-wider text-muted">
          5. Standard Empty State Pattern
        </h2>
        <div className="text-center py-12 rounded-xl border border-border bg-surface p-6">
          <Inbox className="w-10 h-10 text-muted mx-auto mb-2 opacity-60" />
          <h3 className="text-sm font-semibold text-text">No items found</h3>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            This view is currently empty. Connect your Pixel 8a or upload an audio recording to populate data.
          </p>
          <button className="mt-4 px-3 py-1.5 rounded-lg bg-accent text-on-accent text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity">
            Upload audio file
          </button>
        </div>
      </section>
    </div>
  );
};
