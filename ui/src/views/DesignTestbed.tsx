import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  Play,
  ArrowRight,
  CheckCircle2,
  Sliders,
  Layers,
  Smartphone,
  Tablet,
  Monitor,
  Sun,
  Moon,
  Volume2,
  FileText,
  AlertCircle,
  Tag,
  Radio,
  ChevronRight,
  Activity,
  Bookmark,
  Zap,
} from 'lucide-react';

type MockupOption = 'editorial' | 'kinetic' | 'ambient' | 'tokens';
type ViewportSize = 'desktop' | 'tablet' | 'mobile';

export const DesignTestbed: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState<MockupOption>('editorial');
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [isDark, setIsDark] = useState<boolean>(() => document.documentElement.classList.contains('dark'));
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      setIsDark(false);
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      setIsDark(true);
    }
  };

  const viewportWidthClass = {
    desktop: 'w-full max-w-[1400px]',
    tablet: 'w-[1024px] max-w-full',
    mobile: 'w-[390px] max-w-full',
  }[viewport];

  return (
    <div className="min-h-screen bg-bg text-text py-6 px-3 sm:px-6 space-y-8">
      {/* Top Testbed Control Header */}
      <header className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 p-4 rounded-card border border-border bg-surface shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent-tint text-accent">
              Design v2
            </span>
            <h1 className="text-lg font-bold tracking-tight text-text">Art-Direction Board & Testbed</h1>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Compare 3 distinct Home concepts (Wispr Flow & Landon Norris craft) across light/dark & viewports.
          </p>
        </div>

        {/* Options Segmented Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-pill bg-surface-subtle border border-border">
            <button
              onClick={() => setSelectedOption('editorial')}
              className={`px-3 py-1 text-xs font-semibold rounded-pill transition-all ${
                selectedOption === 'editorial'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              Option 1: Editorial Scribe
            </button>
            <button
              onClick={() => setSelectedOption('kinetic')}
              className={`px-3 py-1 text-xs font-semibold rounded-pill transition-all ${
                selectedOption === 'kinetic'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              Option 2: Kinetic Studio
            </button>
            <button
              onClick={() => setSelectedOption('ambient')}
              className={`px-3 py-1 text-xs font-semibold rounded-pill transition-all ${
                selectedOption === 'ambient'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              Option 3: Ambient Paper
            </button>
            <button
              onClick={() => setSelectedOption('tokens')}
              className={`px-3 py-1 text-xs font-semibold rounded-pill transition-all ${
                selectedOption === 'tokens'
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              Tokens & Motion System
            </button>
          </div>

          {/* Viewport Width Controls */}
          <div className="inline-flex p-1 rounded-pill bg-surface-subtle border border-border">
            <button
              onClick={() => setViewport('desktop')}
              title="Desktop (1440px)"
              className={`p-1.5 rounded-full transition-all ${
                viewport === 'desktop' ? 'bg-surface text-accent shadow-sm' : 'text-muted'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              title="Tablet (1024px)"
              className={`p-1.5 rounded-full transition-all ${
                viewport === 'tablet' ? 'bg-surface text-accent shadow-sm' : 'text-muted'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              title="Mobile (390px)"
              className={`p-1.5 rounded-full transition-all ${
                viewport === 'mobile' ? 'bg-surface text-accent shadow-sm' : 'text-muted'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-pill bg-surface border border-border text-muted hover:text-text shadow-sm transition-all"
            title="Toggle Light / Dark theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </header>

      {/* Main Canvas Viewport Container */}
      <div className="flex justify-center transition-all duration-300">
        <div className={`${viewportWidthClass} transition-all duration-300`}>
          {selectedOption === 'editorial' && (
            <EditorialScribeMockup hoveredCard={hoveredCard} setHoveredCard={setHoveredCard} />
          )}
          {selectedOption === 'kinetic' && <KineticStudioMockup />}
          {selectedOption === 'ambient' && <AmbientPaperMockup />}
          {selectedOption === 'tokens' && <TokensAndMotionInspector />}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// OPTION 1: THE EDITORIAL SCRIBE (Wispr Flow Homage)
// ==========================================
const EditorialScribeMockup: React.FC<{
  hoveredCard: number | null;
  setHoveredCard: (id: number | null) => void;
}> = ({ hoveredCard, setHoveredCard }) => {
  return (
    <div className="space-y-10 pb-20">
      {/* 1. Hero Module with Procedural Radial Wash */}
      <section className="relative overflow-hidden rounded-hero border border-border bg-surface p-8 sm:p-12 lg:p-16 shadow-card bg-radial-hero">
        <div className="max-w-3xl space-y-6">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-accent-tint border border-accent/20 text-accent text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Lecture Whisper • Version 2.0</span>
          </div>

          {/* Display Headline with Italic Emphasis */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-sans font-bold tracking-tight text-text leading-[1.08]">
            Every lecture,{' '}
            <em className="font-serif italic font-normal text-accent tracking-normal">
              written down.
            </em>
          </h1>

          <p className="text-base sm:text-lg text-muted max-w-xl leading-relaxed font-normal">
            Autonomous classroom audio capture with on-device speech transcription, disfluency filtering, and grounded study notes.
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button className="px-5 py-3 rounded-pill bg-accent text-on-accent text-sm font-semibold shadow-sm hover:opacity-95 active:scale-95 transition-all flex items-center gap-2">
              <Play className="w-4 h-4 fill-current" />
              <span>Listen to Latest Class</span>
            </button>
            <button className="px-5 py-3 rounded-pill bg-surface border border-border text-text text-sm font-medium hover:bg-surface-subtle active:scale-95 transition-all">
              <span>View Semester Schedule</span>
            </button>
          </div>
        </div>

        {/* Floating Wispr Signature Cleanup Transformation Demo */}
        <div className="mt-12 rounded-card border border-border bg-surface-subtle/80 p-6 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-text uppercase tracking-wider">
                Live Disfluency Filter (Real ASR vs Clean Notes)
              </span>
            </div>
            <span className="text-[11px] font-mono text-muted">Wispr Transformation Pipeline</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Raw Speech with Disfluency Badges */}
            <div className="p-4 rounded-subcard bg-surface border border-border space-y-3">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider">Raw Classroom Audio ASR</span>
              <p className="text-sm text-text/90 leading-relaxed font-sans">
                "So <span className="bg-alert/15 text-alert font-medium px-1 rounded">um, like</span> we talked about last Thursday,{' '}
                <span className="bg-alert/15 text-alert font-medium px-1 rounded">the, the</span> Byzantine consensus protocol,{' '}
                <span className="bg-alert/15 text-alert font-medium px-1 rounded">uh</span>, fundamentally requires a two-thirds majority of honest nodes to tolerate arbitrary crashes."
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-pill bg-alert-tint text-alert border border-alert/20">
                  2 Fillers removed
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-pill bg-alert-tint text-alert border border-alert/20">
                  1 Repetition merged
                </span>
              </div>
            </div>

            {/* Clean Structured Notes */}
            <div className="p-4 rounded-subcard bg-accent-tint/40 border border-accent/20 space-y-3">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Synthesized Study Note</span>
              <div className="text-sm text-text space-y-1.5">
                <p className="font-semibold text-accent">Byzantine Consensus Protocol:</p>
                <p className="text-muted leading-relaxed">
                  Requires <strong className="text-text">&gt; 2/3 honest node majority</strong> to guarantee system safety under arbitrary failure modes.
                </p>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-accent pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Grounded with timestamp 00:14:22</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Horizontal Day Track (Today's Classes with Live Now-Line) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-text">Today's Lectures</h2>
            <p className="text-xs text-muted">Wednesday, September 24 • Live schedule synchronized with Pixel 8a</p>
          </div>
          <span className="text-xs font-mono font-semibold text-accent bg-accent-tint px-2.5 py-1 rounded-pill">
            Now: 11:45 AM
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {/* Class 1: Completed */}
          <div className="p-5 rounded-card border border-border bg-surface space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-muted">09:00 – 10:30</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-pill bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Processed
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-text">Distributed Systems</h3>
              <p className="text-xs text-muted">Prof. V. Balasubramanian • Lecture 07</p>
            </div>
            <div className="text-xs text-muted border-t border-border pt-2 flex justify-between items-center">
              <span>5 grounded takeaways</span>
              <span className="text-accent font-semibold flex items-center gap-1 hover:underline cursor-pointer">
                Read notes <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Class 2: Active / In-Progress */}
          <div className="p-5 rounded-card border-2 border-accent bg-surface space-y-3 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1 bg-accent" />
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-accent font-bold">11:30 – 13:00</span>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-pill bg-accent text-on-accent">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>Recording Now</span>
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-text">Machine Learning & Neural Nets</h3>
              <p className="text-xs text-muted">Dr. S. Raman • Room 304</p>
            </div>
            <div className="text-xs text-text border-t border-border pt-2 flex justify-between items-center">
              <span className="font-mono">Chunk 04 arriving (14 ms)</span>
              <span className="text-accent font-bold">Active audio</span>
            </div>
          </div>

          {/* Class 3: Upcoming */}
          <div className="p-5 rounded-card border border-border bg-surface-subtle space-y-3 opacity-80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-muted">14:00 – 15:30</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-pill bg-surface text-muted border border-border">
                Upcoming
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-text">Computer Architecture</h3>
              <p className="text-xs text-muted">Prof. K. Venkatesh • Hall B</p>
            </div>
            <div className="text-xs text-muted border-t border-border pt-2 flex justify-between items-center">
              <span>Starts in 2h 15m</span>
              <span className="text-muted">Auto-record armed</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Recent Lectures Gallery with Base/Hover Card Flip */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-text">Recent Recordings</h2>
            <p className="text-xs text-muted">Hover any card to inspect top study points without opening</p>
          </div>
          <button className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
            View All 24 Lectures <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              id: 1,
              subject: 'Operating Systems & Virtual Memory',
              prof: 'Prof. R. Govindaraj',
              date: 'Sep 22, 2026',
              duration: '01:24:18',
              takeaways: ['Page fault handling routine', 'TLB miss penalties', 'Two-level page table calculation'],
              deadline: 'Lab 2 due this Friday 23:59',
            },
            {
              id: 2,
              subject: 'Database Internals & B+ Trees',
              prof: 'Dr. M. Sridharan',
              date: 'Sep 20, 2026',
              duration: '01:12:45',
              takeaways: ['Node split order of operations', 'WAL (Write-Ahead Logging)', 'ARIES recovery protocol'],
              deadline: 'Quiz next Monday 09:00',
            },
            {
              id: 3,
              subject: 'Distributed Consensus & Raft',
              prof: 'Prof. V. Balasubramanian',
              date: 'Sep 18, 2026',
              duration: '01:38:02',
              takeaways: ['Leader election term timeouts', 'Log replication safety', 'Joint consensus reconfiguration'],
              deadline: 'Assignment 3 due in 8 days',
            },
          ].map((rec) => {
            const isHovered = hoveredCard === rec.id;
            return (
              <div
                key={rec.id}
                onMouseEnter={() => setHoveredCard(rec.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className="relative rounded-card border border-border bg-surface p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer min-h-[220px] flex flex-col justify-between"
              >
                {!isHovered ? (
                  /* Base Face */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span className="font-mono">{rec.date}</span>
                      <span className="font-mono tabular-nums">{rec.duration}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text leading-snug">{rec.subject}</h3>
                      <p className="text-xs text-muted mt-1">{rec.prof}</p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{rec.deadline}</span>
                    </div>
                  </div>
                ) : (
                  /* Hover Face (Lando-style Instant Disclosure) */
                  <div className="space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent">Top Takeaways</span>
                      <span className="text-[10px] font-mono text-muted">Click to open</span>
                    </div>
                    <ul className="text-xs text-text space-y-2">
                      {rec.takeaways.map((t, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-accent font-bold">•</span>
                          <span className="line-clamp-1">{t}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-border pt-2 text-[11px] font-semibold text-alert">
                      ⚠️ {rec.deadline}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Floating Whisper Bar (Wispr Flow Analogue anchored at bottom) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
        <div className="flex items-center gap-3 px-5 py-3 rounded-pill bg-surface/95 border border-border shadow-xl backdrop-blur-md">
          {/* Animated Waveform Indicator */}
          <div className="flex items-center gap-0.5 h-4">
            <div className="w-0.5 bg-accent h-3 rounded-full animate-pulse" />
            <div className="w-0.5 bg-accent h-4 rounded-full animate-pulse delay-75" />
            <div className="w-0.5 bg-accent h-2 rounded-full animate-pulse delay-150" />
            <div className="w-0.5 bg-accent h-4 rounded-full animate-pulse delay-100" />
            <div className="w-0.5 bg-accent h-2.5 rounded-full animate-pulse delay-200" />
          </div>

          <div className="text-xs">
            <span className="font-semibold text-text">Pixel 8a Connected</span>
            <span className="text-muted font-mono ml-2">• 14ms latency</span>
          </div>

          <button className="px-3 py-1 rounded-pill bg-accent-tint text-accent text-xs font-semibold hover:bg-accent hover:text-on-accent transition-all">
            Open Queue
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// OPTION 2: THE KINETIC STUDIO (Landon Norris Energy)
// ==========================================
const KineticStudioMockup: React.FC = () => {
  return (
    <div className="space-y-10 pb-20">
      {/* 1. Kinetic Hero with Massive Split Display Type */}
      <section className="p-8 sm:p-14 rounded-hero border border-border bg-surface shadow-card space-y-8">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-muted">
            STUDIO MODE // TELEMETRY
          </span>
          <span className="text-xs font-mono text-accent">60 FPS REALTIME AUDIO</span>
        </div>

        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-sans font-black tracking-tighter text-text leading-[0.9] uppercase">
          ZERO DRIFT.{' '}
          <span className="font-serif italic font-normal text-accent tracking-normal lowercase block sm:inline">
            total recall.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-muted max-w-xl font-mono">
          Continuous background capture with hardware-accelerated local Whisper inference. Zero cloud dependency.
        </p>

        {/* Big Countdown Hero Block */}
        <div className="p-6 rounded-card bg-surface-subtle border border-border flex flex-wrap items-center justify-between gap-6">
          <div>
            <span className="text-xs font-mono text-muted uppercase tracking-wider">Next Scheduled Recording</span>
            <h3 className="text-2xl font-bold text-text mt-1">Distributed Systems Lab 03</h3>
            <p className="text-xs text-muted">Lab Room 402 • Prof. Balasubramanian</p>
          </div>
          <div className="text-right">
            <div className="text-4xl sm:text-6xl font-mono font-black tabular-nums text-accent tracking-tight">
              01:42:15
            </div>
            <span className="text-[11px] font-mono text-muted uppercase">Countdown to auto-sync</span>
          </div>
        </div>
      </section>

      {/* 2. Landon Norris Typographic Marquee Tape */}
      <div className="overflow-hidden rounded-pill border border-border bg-surface py-3 shadow-sm">
        <div className="flex items-center gap-8 whitespace-nowrap animate-marquee">
          {[
            '# Gradient Descent (24x)',
            '# Byzantine Fault (18x)',
            '# Cache Invalidation (15x)',
            '# Eigenvalues (12x)',
            '# Pipelining Hazards (11x)',
            '# Virtual Memory (9x)',
            '# Quorum Sensing (8x)',
          ].map((phrase, i) => (
            <span key={i} className="text-xs font-mono font-bold text-text flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              {phrase}
            </span>
          ))}
        </div>
      </div>

      {/* 3. Studio Telemetry Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-card border border-border bg-surface space-y-4">
          <span className="text-xs font-mono text-muted uppercase">Talk-Time Diarization</span>
          <div className="text-3xl font-bold text-text font-mono">85.2% / 14.8%</div>
          <div className="w-full h-3 rounded-pill bg-surface-subtle overflow-hidden flex">
            <div className="bg-accent h-full w-[85%]" />
            <div className="bg-muted h-full w-[15%]" />
          </div>
          <p className="text-xs text-muted">Lecturer presentation vs Student questions</p>
        </div>

        <div className="p-6 rounded-card border border-border bg-surface space-y-4">
          <span className="text-xs font-mono text-muted uppercase">Local Inference Pace</span>
          <div className="text-3xl font-bold text-text font-mono">148 WPM</div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
            <Activity className="w-4 h-4" />
            <span>Optimal transcription pace</span>
          </div>
          <p className="text-xs text-muted">Zero dropped frames across 12 hours</p>
        </div>

        <div className="p-6 rounded-card border border-border bg-surface space-y-4">
          <span className="text-xs font-mono text-muted uppercase">Extracted Tasks</span>
          <div className="text-3xl font-bold text-accent font-mono">4 Action Items</div>
          <div className="text-xs text-muted">Next deadline: Assignment 2 (Friday 23:59)</div>
          <button className="w-full py-2 rounded-control bg-accent-tint text-accent text-xs font-semibold hover:bg-accent hover:text-on-accent transition-all">
            Export to .ics
          </button>
        </div>
      </section>
    </div>
  );
};

// ==========================================
// OPTION 3: THE AMBIENT PAPER (Minimalist Notion/Linear Calm)
// ==========================================
const AmbientPaperMockup: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      {/* Editorial Headline */}
      <div className="space-y-3 pt-6">
        <h1 className="text-4xl sm:text-5xl font-sans font-medium tracking-tight text-text">
          Your semester,{' '}
          <em className="font-serif italic text-accent font-normal">
            unfolded.
          </em>
        </h1>
        <p className="text-sm text-muted">
          3 lectures recorded this week • 4 upcoming deadlines • 0 unconfirmed items
        </p>
      </div>

      {/* Unified Chronological Daily Stream */}
      <div className="space-y-4">
        {[
          {
            time: '09:00 AM',
            type: 'lecture',
            title: 'Distributed Systems & Byzantine Agreement',
            meta: 'Lecture 07 • 01:24:18 • Prof. Balasubramanian',
            bullets: [
              'Byzantine fault tolerance requires 3f + 1 total nodes to tolerate f arbitrary failures.',
              'Safety is prioritized over liveness in asynchronous consensus models.',
            ],
            badge: 'Notes Ready',
          },
          {
            time: '11:30 AM',
            type: 'recording',
            title: 'Machine Learning & Optimization Landscapes',
            meta: 'Lecture 08 • Recording Live via Pixel 8a',
            bullets: ['Stochastic gradient descent with momentum and adaptive learning rates.'],
            badge: 'Recording',
          },
          {
            time: '02:00 PM',
            type: 'deadline',
            title: 'Lab 02: Consensus Engine Submission Due',
            meta: 'CS420 Coursework Portal',
            bullets: ['Submit zip with test suite passing all 4 randomized partition scenarios.'],
            badge: 'Deadline',
          },
        ].map((item, idx) => (
          <div key={idx} className="p-6 rounded-card border border-border bg-surface space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-muted">{item.time}</span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-pill ${
                  item.badge === 'Recording'
                    ? 'bg-accent text-on-accent'
                    : item.badge === 'Deadline'
                    ? 'bg-alert-tint text-alert'
                    : 'bg-surface-subtle text-muted'
                }`}
              >
                {item.badge}
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold text-text">{item.title}</h3>
              <p className="text-xs text-muted">{item.meta}</p>
            </div>
            <ul className="text-xs text-text space-y-1.5 border-t border-border pt-3">
              {item.bullets.map((b, bIdx) => (
                <li key={bIdx} className="flex items-start gap-2">
                  <span className="text-accent font-bold">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// TOKENS & MOTION SYSTEM INSPECTOR
// ==========================================
const TokensAndMotionInspector: React.FC = () => {
  return (
    <div className="space-y-10 pb-20">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-text">Design & Motion Tokens System</h2>
        <p className="text-xs text-muted mt-1">
          Single source of truth in code: WCAG AA verified color hierarchy, dual typography, and physics springs.
        </p>
      </div>

      {/* 1. Color Swatches */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">1. Strict 2-Hue Palette</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-card border border-border bg-bg h-28 flex flex-col justify-between">
            <span className="text-xs font-mono text-muted">--bg</span>
            <div>
              <div className="text-xs font-bold text-text">Paper Canvas</div>
              <div className="text-[11px] font-mono text-muted">#FAFAF9 / #0A0A0A</div>
            </div>
          </div>
          <div className="p-4 rounded-card border border-border bg-surface h-28 flex flex-col justify-between">
            <span className="text-xs font-mono text-muted">--surface</span>
            <div>
              <div className="text-xs font-bold text-text">Card Surface</div>
              <div className="text-[11px] font-mono text-muted">#FFFFFF / #141414</div>
            </div>
          </div>
          <div className="p-4 rounded-card border border-border bg-accent text-on-accent h-28 flex flex-col justify-between">
            <span className="text-xs font-mono opacity-80">--accent</span>
            <div>
              <div className="text-xs font-bold">Brand Indigo</div>
              <div className="text-[11px] font-mono opacity-90">#4F46E5 / #818CF8</div>
            </div>
          </div>
          <div className="p-4 rounded-card border border-border bg-alert text-white h-28 flex flex-col justify-between">
            <span className="text-xs font-mono opacity-80">--alert</span>
            <div>
              <div className="text-xs font-bold">Alert Crimson</div>
              <div className="text-[11px] font-mono opacity-90">#DC2626 / #F87171</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Typography Specimen */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">2. Typography Pairings</h3>
        <div className="p-6 rounded-card border border-border bg-surface space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-mono text-muted uppercase">Headline Display Scale (Inter + Instrument Serif Italic)</span>
            <p className="text-3xl sm:text-5xl font-sans font-bold text-text">
              Precision notes, <em className="font-serif italic font-normal text-accent">grounded in speech.</em>
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border text-xs">
            <div>
              <span className="font-semibold text-text block mb-1">Inter UI (Grotesk)</span>
              <p className="text-muted leading-relaxed">
                Workhorse for UI labels, tables, transcript paragraphs, and metadata. Clean, modern, high legibility at micro sizes.
              </p>
            </div>
            <div>
              <span className="font-semibold text-accent block mb-1">Instrument Serif (OFL Italic)</span>
              <p className="text-muted leading-relaxed">
                Expressive editorial warmth used selectively for emphasis words in display headlines. Never for body text.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Motion System & Physics Springs */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted">3. Motion Tokens & Physics Springs</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-card border border-border bg-surface space-y-2">
            <span className="text-xs font-mono font-bold text-accent">springSnappy</span>
            <p className="text-xs text-muted">Stiffness: 420, Damping: 30</p>
            <p className="text-xs text-text">Tactile feedback on button presses, segmented switchers, and icon clicks.</p>
          </div>
          <div className="p-5 rounded-card border border-border bg-surface space-y-2">
            <span className="text-xs font-mono font-bold text-accent">springGentle</span>
            <p className="text-xs text-muted">Stiffness: 220, Damping: 24</p>
            <p className="text-xs text-text">Card expansions, modal overlays, drawer sliding, and layout transitions.</p>
          </div>
          <div className="p-5 rounded-card border border-border bg-surface space-y-2">
            <span className="text-xs font-mono font-bold text-accent">springMorph</span>
            <p className="text-xs text-muted">Stiffness: 300, Damping: 28</p>
            <p className="text-xs text-text">Floating Whisper Bar width/height transitions as device states evolve.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
