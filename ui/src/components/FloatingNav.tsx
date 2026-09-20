'use client';

import React, { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import {
  Search,
  Settings,
  ArrowRight,
  Menu,
  X,
  ChevronLeft,
  Home,
  BookOpen,
  Calendar,
  HelpCircle,
  CalendarDays,
  Smartphone,
  Upload,
} from 'lucide-react';
import { LogoMark } from './LogoMark';

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

interface NavLinkItem {
  id: NavTab;
  label: string;
  icon: React.ReactNode;
  shortcut: string;
}

const PRIMARY_LINKS: NavLinkItem[] = [
  { id: 'inbox', label: 'Home', icon: <Home className="w-4 h-4" />, shortcut: 'g h' },
  { id: 'lecture', label: 'Lectures', icon: <BookOpen className="w-4 h-4" />, shortcut: 'g l' },
  { id: 'events', label: 'Deadlines', icon: <Calendar className="w-4 h-4" />, shortcut: 'g d' },
  { id: 'questions', label: 'Insights', icon: <HelpCircle className="w-4 h-4" />, shortcut: 'g i' },
  { id: 'timetable', label: 'Schedule', icon: <CalendarDays className="w-4 h-4" />, shortcut: 'g s' },
];

export interface FloatingNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onOpenPairing: () => void;
  pairedDeviceCount: number;
  upcomingEventsCount: number;
  isLectureDetail?: boolean;
  lectureTitle?: string;
  theme: 'light' | 'dark' | 'system';
  onToggleTheme: () => void;
  demoMode?: boolean;
}

export const FloatingNav: React.FC<FloatingNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenSearch,
  onOpenSettings,
  onOpenPairing,
  pairedDeviceCount,
  upcomingEventsCount,
  isLectureDetail = false,
  lectureTitle,
  demoMode = false,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Scroll condensation detector (> 24px)
  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard navigation shortcuts: g + h/l/d/i/s, ⌘K, ⌘,
  useEffect(() => {
    let gKeyPressed = false;
    let gTimeout: any = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // ⌘K or Ctrl+K -> Search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenSearch();
        return;
      }

      // ⌘, or Ctrl+, -> Settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        onOpenSettings();
        return;
      }

      // Sequence: g then h/l/d/i/s
      if (e.key.toLowerCase() === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        gKeyPressed = true;
        clearTimeout(gTimeout);
        gTimeout = setTimeout(() => {
          gKeyPressed = false;
        }, 1200);
        return;
      }

      if (gKeyPressed) {
        gKeyPressed = false;
        clearTimeout(gTimeout);
        const map: Record<string, NavTab> = {
          h: 'inbox',
          l: 'lecture',
          d: 'events',
          i: 'questions',
          s: 'timetable',
        };
        const targetTab = map[e.key.toLowerCase()];
        if (targetTab) {
          e.preventDefault();
          onSelectTab(targetTab);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(gTimeout);
    };
  }, [onSelectTab, onOpenSearch, onOpenSettings]);

  const isTabActive = (tabId: NavTab) => activeTab === tabId;

  const ctaLabel = pairedDeviceCount === 0 ? 'Pair Pixel' : 'Upload audio';
  const ctaAriaLabel =
    pairedDeviceCount === 0 ? 'Pair Pixel 8a via QR code' : 'Upload audio recording';

  const currentTabLabel = PRIMARY_LINKS.find((l) => l.id === activeTab)?.label || 'Menu';

  if (!mounted) {
    return (
      <nav role="navigation" aria-label="Main" className="fixed top-4 left-0 right-0 z-50 pointer-events-none px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4" />
      </nav>
    );
  }

  return (
    <>
      {/* Skip to main content link for screen readers & keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-6 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent focus:text-on-accent focus:rounded-pill focus:font-semibold focus:shadow-md"
      >
        Skip to main content
      </a>

      {/* Floating Navbar Container */}
      <nav
        role="navigation"
        aria-label="Main"
        className="fixed top-4 left-0 right-0 z-50 pointer-events-none px-4 sm:px-6 transition-all"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* ========================================================= */}
          {/* DESKTOP & TABLET LEFT PILL (>= 768px)                     */}
          {/* Exact geometry: 52px height, 6px padding, 40px items       */}
          {/* ========================================================= */}
          <div className="hidden md:flex items-center pointer-events-auto">
            <div
              className={`nav-pill-container flex items-center shadow-xs transition-shadow ${
                scrolled ? 'shadow-md shadow-black/5 dark:shadow-black/30' : ''
              }`}
            >
              {/* Circular Logo Badge (40px) with brand mark */}
              <button
                onClick={() => onSelectTab('inbox')}
                className="w-10 h-10 rounded-full bg-accent text-on-accent flex items-center justify-center shrink-0 mr-[6px] shadow-xs focus-visible:ring-2 focus-visible:ring-accent select-none"
                aria-label="Lecture Whisper Home"
                title="Go to Home (g h)"
              >
                <LogoMark className="w-5 h-5" />
              </button>

              {/* Condensed Lecture View or 5 Primary Links */}
              {isLectureDetail ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onSelectTab('lecture')}
                    className="nav-item h-10 px-3 flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-text relative focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span className="nav-highlight" aria-hidden="true" />
                    <ChevronLeft className="w-3.5 h-3.5 relative z-10" />
                    <span className="relative z-10">Lectures</span>
                  </button>
                  <span className="w-1 h-1 rounded-full bg-border mx-1" />
                  <span className="text-xs font-semibold text-text max-w-[220px] truncate px-2">
                    {lectureTitle || 'Lecture Details'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-[2px]" role="menubar">
                  {PRIMARY_LINKS.map((link) => {
                    const active = isTabActive(link.id);
                    const showBadge = link.id === 'events' && upcomingEventsCount > 0;

                    return (
                      <button
                        key={link.id}
                        role="menuitem"
                        aria-current={active ? 'page' : undefined}
                        onClick={() => onSelectTab(link.id)}
                        title={`${link.label} (${link.shortcut})`}
                        className="nav-item nav-link flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        {/* Per-item fade highlight layer (40px tall, fully rounded, inset 0) */}
                        <span className="nav-highlight" aria-hidden="true" />

                        {/* On 768-1023px (md): inactive links collapse to icon; active shows full label */}
                        <span className={`relative z-10 ${active ? 'inline' : 'hidden lg:inline'}`}>
                          {link.label}
                        </span>
                        <span
                          className={`relative z-10 ${active ? 'hidden' : 'inline lg:hidden'}`}
                          aria-hidden="true"
                        >
                          {link.icon}
                        </span>

                        {/* Deadlines count badge: neutral or accent, never red */}
                        {showBadge && (
                          <span
                            className={`relative z-10 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                              active
                                ? 'bg-[var(--nav-pill-bg)] text-text'
                                : 'bg-accent/15 text-accent dark:bg-accent/25 dark:text-accent'
                            }`}
                          >
                            {upcomingEventsCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* MOBILE PILL (< 768px)                                     */}
          {/* Exact geometry: 52px height, 6px padding, 40px items       */}
          {/* ========================================================= */}
          <div className="flex md:hidden items-center justify-between w-full max-w-sm mx-auto pointer-events-auto">
            <div
              className={`nav-pill-container flex items-center justify-between w-full shadow-xs transition-all ${
                scrolled ? 'shadow-md shadow-black/5 dark:shadow-black/30' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {/* Logo Badge (40px) */}
                <button
                  onClick={() => onSelectTab('inbox')}
                  className="w-10 h-10 rounded-full bg-accent text-on-accent flex items-center justify-center shrink-0 shadow-xs active:scale-95"
                  aria-label="Lecture Whisper Home"
                  title="Go to Home"
                >
                  <LogoMark className="w-5 h-5" />
                </button>

                {/* Current Page Name */}
                <span className="text-xs font-semibold text-text px-1 max-w-[140px] truncate">
                  {isLectureDetail ? lectureTitle || 'Lecture' : currentTabLabel}
                </span>

                {demoMode && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    Demo
                  </span>
                )}
              </div>

              {/* Menu Drawer Trigger (40px) */}
              <button
                onClick={() => setMobileOpen(true)}
                className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-text hover:bg-surface-elevated transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Open navigation menu"
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT CLUSTER: Search + Settings + CTA Pill (>= 768px)    */}
          {/* Exact geometry: 52px height pills, 40px interactive items */}
          {/* ========================================================= */}
          <div className="hidden md:flex items-center gap-2 pointer-events-auto">
            {/* Prominent Demo Mode Badge when seeded data is displayed */}
            {demoMode && (
              <div className="nav-pill-container flex items-center gap-2 px-3.5 py-1 shadow-xs border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Demo Mode (Sample Data)</span>
              </div>
            )}

            {/* 40px Circular Search Button in 52px Pill */}
            <div className="nav-pill-container flex items-center justify-center shadow-xs">
              <button
                onClick={onOpenSearch}
                className="nav-item w-10 h-10 rounded-full text-muted hover:text-text focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Search lectures and transcripts (⌘K)"
                title="Search (⌘K)"
              >
                <span className="nav-highlight" aria-hidden="true" />
                <Search className="w-4 h-4 relative z-10" />
              </button>
            </div>

            {/* 40px Circular Settings Button in 52px Pill */}
            <div className="nav-pill-container flex items-center justify-center shadow-xs">
              <button
                onClick={onOpenSettings}
                className="nav-item w-10 h-10 rounded-full text-muted hover:text-text focus-visible:ring-2 focus-visible:ring-accent"
                aria-label="Settings and Keyboard Shortcuts (⌘,)"
                title="Settings (⌘,)"
              >
                <span className="nav-highlight" aria-hidden="true" />
                <Settings className="w-4 h-4 relative z-10" />
              </button>
            </div>

            {/* State-Aware Call-To-Action Pill: 52px height, 6px padding */}
            <div className="nav-pill-container flex items-center gap-[6px] shadow-xs group">
              {/* Inner Label Pill (40px height) */}
              <button
                onClick={onOpenPairing}
                className="h-10 px-4 rounded-full bg-[#171717] text-[#FAFAF9] hover:bg-[#262626] dark:bg-[#262626] dark:text-[#EDEDED] dark:hover:bg-[#333333] text-[13px] font-semibold tracking-tight transition-colors duration-[140ms] flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={ctaAriaLabel}
              >
                {pairedDeviceCount === 0 ? (
                  <Smartphone className="w-3.5 h-3.5 opacity-80" />
                ) : (
                  <Upload className="w-3.5 h-3.5 opacity-80" />
                )}
                <span>{ctaLabel}</span>
              </button>

              {/* 40px Circular Arrow Button with 45° hover rotation */}
              <button
                onClick={onOpenPairing}
                className="w-10 h-10 rounded-full bg-accent text-on-accent hover:bg-accent/90 flex items-center justify-center shrink-0 shadow-xs transition-transform duration-200 group-hover:rotate-45 focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={ctaAriaLabel}
                title={ctaLabel}
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ========================================================= */}
      {/* MOBILE SHEET DRAWER (Vaul Drawer)                         */}
      {/* ========================================================= */}
      <Drawer.Root open={mobileOpen} onOpenChange={setMobileOpen} shouldScaleBackground>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] rounded-t-[28px] border-t border-border bg-surface p-6 flex flex-col gap-6 focus:outline-none shadow-2xl">
            {/* Drawer Handle */}
            <div className="w-12 h-1.5 rounded-full bg-border mx-auto shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent text-on-accent flex items-center justify-center">
                  <LogoMark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-text text-base leading-tight">Lecture Whisper</h3>
                  <p className="text-xs text-muted">Offline Speech & Notes</p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-muted hover:text-text transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="space-y-1.5 flex-1 overflow-y-auto">
              {PRIMARY_LINKS.map((link) => {
                const active = isTabActive(link.id);
                const showBadge = link.id === 'events' && upcomingEventsCount > 0;

                return (
                  <button
                    key={link.id}
                    onClick={() => {
                      onSelectTab(link.id);
                      setMobileOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl text-left text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-accent-tint text-accent'
                        : 'text-text hover:bg-surface-elevated'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={active ? 'text-accent' : 'text-muted'}>
                        {link.icon}
                      </span>
                      <span>{link.label}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {showBadge && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-accent/20 text-accent tabular-nums">
                          {upcomingEventsCount}
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-muted uppercase">
                        {link.shortcut}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions inside Mobile Sheet */}
            <div className="pt-4 border-t border-border space-y-3 shrink-0">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenSearch();
                  }}
                  className="p-3 rounded-xl border border-border bg-surface-elevated text-text text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-colors hover:bg-surface-muted"
                >
                  <Search className="w-4 h-4 text-muted" />
                  <span>Search (⌘K)</span>
                </button>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenSettings();
                  }}
                  className="p-3 rounded-xl border border-border bg-surface-elevated text-text text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-colors hover:bg-surface-muted"
                >
                  <Settings className="w-4 h-4 text-muted" />
                  <span>Settings (⌘,)</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setMobileOpen(false);
                  onOpenPairing();
                }}
                className="w-full py-3.5 px-4 rounded-pill bg-accent text-on-accent text-sm font-semibold flex items-center justify-between shadow-sm active:scale-95 transition-transform"
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
};

export default FloatingNav;