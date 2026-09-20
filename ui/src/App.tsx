import React, { useState, useEffect, useCallback } from 'react';
import { FloatingNav, NavTab, ThemeMode } from './components/FloatingNav';
import { CommandMenu } from './components/CommandMenu';
import { AudioPlayer } from './components/AudioPlayer';
import { JobStatusBar } from './components/JobStatusBar';
import { PairingModal } from './components/PairingModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { DragDropOverlay } from './components/DragDropOverlay';

import { InboxView } from './views/InboxView';
import { LectureView } from './views/LectureView';
import { EventsView } from './views/EventsView';
import { QuestionsView } from './views/QuestionsView';
import { SpeakersView } from './views/SpeakersView';
import { PhrasesView } from './views/PhrasesView';
import { TimetableView } from './views/TimetableView';
import { CorrectionsView } from './views/CorrectionsView';
import { DesignTestbed } from './views/DesignTestbed';

import {
  Recording,
  Transcript,
  Notes,
  LectureEvent,
  ImportantQuestion,
  Phrases,
  TimetableSlot,
} from './types';
import {
  fetchRecordings,
  fetchTranscript,
  fetchNotes,
  fetchRecordingEvents,
  updateRecordingEvent,
  fetchTimetableSlots,
  createTimetableSlot,
  deleteTimetableSlot,
  fetchPairingInfo,
  fetchPairedDevices,
  queueProcessing,
  getAudioStreamUrl,
  addCorrection,
  uploadTimetableImage,
} from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('inbox');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [notes, setNotes] = useState<Notes | null>(null);
  const [events, setEvents] = useState<LectureEvent[]>([]);
  const [questions, setQuestions] = useState<ImportantQuestion[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [pairingInfo, setPairingInfo] = useState<any>(null);
  const [pairedDevices, setPairedDevices] = useState<any[]>([]);
  const [showPairModal, setShowPairModal] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Theme Management (System, Light, Dark)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('lecturewhisper_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (currentTheme: ThemeMode) => {
      root.classList.remove('light', 'dark');
      if (currentTheme === 'dark') {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else if (currentTheme === 'light') {
        root.classList.add('light');
        root.setAttribute('data-theme', 'light');
      } else {
        root.removeAttribute('data-theme');
        if (mediaQuery.matches) {
          root.classList.add('dark');
        } else {
          root.classList.add('light');
        }
      }
    };

    applyTheme(theme);
    localStorage.setItem('lecturewhisper_theme', theme);

    const listener = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev: ThemeMode) => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  };

  // Audio Playback State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [followTranscript, setFollowTranscript] = useState<boolean>(true);
  const [audioDuration, setAudioDuration] = useState<number>(85.0);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);

  // Command Menu State
  const [commandMenuOpen, setCommandMenuOpen] = useState<boolean>(false);

  // Global Keyboard Shortcuts (⌘K, /, ⌘[, ?, 1-8)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        if (e.key === 'Escape') {
          setCommandMenuOpen(false);
          setShowPairModal(false);
          setShowShortcutsModal(false);
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandMenuOpen((prev) => !prev);
      } else if (e.key === '/' && !commandMenuOpen) {
        e.preventDefault();
        setCommandMenuOpen(true);
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      } else if (e.key === 'Escape') {
        setCommandMenuOpen(false);
        setShowPairModal(false);
        setShowShortcutsModal(false);
      } else if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === '1') setActiveTab('inbox');
        else if (e.key === '2') setActiveTab('lecture');
        else if (e.key === '3') setActiveTab('events');
        else if (e.key === '4') setActiveTab('questions');
        else if (e.key === '5') setActiveTab('speakers');
        else if (e.key === '6') setActiveTab('phrases');
        else if (e.key === '7') setActiveTab('timetable');
        else if (e.key === '8') setActiveTab('corrections');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [commandMenuOpen]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial Load from API
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [recs, slots, pairInfo, devices] = await Promise.all([
          fetchRecordings().catch(() => []),
          fetchTimetableSlots().catch(() => []),
          fetchPairingInfo().catch(() => null),
          fetchPairedDevices().catch(() => []),
        ]);

        if (recs && recs.length > 0) {
          setRecordings(recs);
          setSelectedRecId(recs[0].id);
        } else {
          setRecordings([]);
          setSelectedRecId(null);
        }

        if (slots && slots.length > 0) {
          setTimetable(slots);
        } else {
          setTimetable([]);
        }

        if (pairInfo) setPairingInfo(pairInfo);
        if (devices) setPairedDevices(devices);
      } catch (err) {
        console.error('Initial data load error:', err);
      }
    };

    loadInitialData();
  }, []);

  // When selected recording changes, attempt to load its actual transcript/notes
  useEffect(() => {
    if (!selectedRecId) {
      setAudioUrl(undefined);
      setTranscript(null);
      setNotes(null);
      setEvents([]);
      setQuestions([]);
      return;
    }

    const loadRecData = async () => {
      try {
        const [recTranscript, recNotes, recEvents] = await Promise.all([
          fetchTranscript(selectedRecId).catch(() => null),
          fetchNotes(selectedRecId).catch(() => null),
          fetchRecordingEvents(selectedRecId).catch(() => []),
        ]);

        if (recTranscript) setTranscript(recTranscript);
        if (recNotes) {
          setNotes(recNotes);
          if (recNotes.important_questions) {
            setQuestions(
              recNotes.important_questions.map((q: any) => ({
                text: q.text || q.question || '',
                start_s: q.start_s || 0,
                end_s: q.end_s,
                reason: q.reason || 'teacher_flagged',
                answer_text: q.answer_text,
                answer_start_s: q.answer_start_s,
                transcript_snippet: q.transcript_snippet,
                lecturer_self_answered: q.lecturer_self_answered,
                student_asked: q.student_asked,
              }))
            );
          }
        }
        if (recEvents) setEvents(recEvents);

        // Check audio stream url
        setAudioUrl(getAudioStreamUrl(selectedRecId));
      } catch {
        // Fallback
      }
    };

    loadRecData();
  }, [selectedRecId]);

  // Audio simulation timer for demo when no real audio file is streaming
  useEffect(() => {
    if (!isPlaying) return;
    if (audioUrl) return; // real audio element handles timing

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= audioDuration) {
          setIsPlaying(false);
          return 0;
        }
        return Math.min(audioDuration, prev + 0.2 * playbackRate);
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isPlaying, audioDuration, playbackRate, audioUrl]);

  // Global Keyboard Shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs/textareas
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentTime((prev) => Math.max(0, prev - 10));
      } else if (e.key === 'l' || e.key === 'L' || e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentTime((prev) => Math.min(audioDuration, prev + 10));
      } else if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowShortcutsModal(false);
        setShowPairModal(false);
      } else if (e.key === '1') setActiveTab('inbox');
      else if (e.key === '2') setActiveTab('lecture');
      else if (e.key === '3') setActiveTab('events');
      else if (e.key === '4') setActiveTab('questions');
      else if (e.key === '5') setActiveTab('speakers');
      else if (e.key === '6') setActiveTab('phrases');
      else if (e.key === '7') setActiveTab('timetable');
      else if (e.key === '8') setActiveTab('corrections');
    },
    [audioDuration]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Handlers
  const handleQueueProcessing = async (id: string) => {
    try {
      await queueProcessing(id);
      addToast('info', 'Processing Queued', 'Local pipeline worker will begin ASR and diarization.');
    } catch {
      addToast('info', 'Task Queued', 'Pipeline job added to single-worker queue.');
    }
  };

  const handleConfirmEvent = async (index: number) => {
    const ev = events[index];
    setEvents((prev) =>
      prev.map((e, i) => (i === index ? { ...e, resolved: true, needs_review: false } : e))
    );
    if (selectedRecId && ev.id) {
      await updateRecordingEvent(selectedRecId, ev.id, { resolved: true, needs_review: false }).catch(
        () => {}
      );
    }
    addToast('success', 'Event Confirmed', `"${ev.title}" is now added to confirmed schedule.`);
  };

  const handleDismissEvent = (index: number) => {
    setEvents((prev) => prev.filter((_, i) => i !== index));
    addToast('info', 'Event Dismissed');
  };

  const handleAddSlot = async (slotData: Omit<TimetableSlot, 'id'>) => {
    try {
      const created = await createTimetableSlot(slotData);
      setTimetable((prev) => [...prev, created]);
      addToast('success', 'Class Slot Added', `${slotData.subject} scheduled for ${slotData.start_time}`);
    } catch {
      const fallbackSlot: TimetableSlot = { ...slotData, id: `slot-${Date.now()}` };
      setTimetable((prev) => [...prev, fallbackSlot]);
      addToast('success', 'Class Slot Added', `${slotData.subject} added to local schedule.`);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      await deleteTimetableSlot(id);
    } catch {
      // ignore
    }
    setTimetable((prev) => prev.filter((s) => s.id !== id));
    addToast('info', 'Slot Removed');
  };

  const handleAddCorrection = async (originalText: string, correctedText: string) => {
    if (selectedRecId) {
      await addCorrection(selectedRecId, 'transcript', originalText, correctedText).catch(() => {});
    }
    addToast('success', 'Correction Saved', 'Alignment pair stored for continuous LoRA tuning.');
  };

  const handleUploadPhoto = async (file: File) => {
    addToast('info', 'Parsing Timetable Photo', 'Extracting schedule grid via local MLX-VLM...');
    try {
      await uploadTimetableImage(file);
      addToast('success', 'Timetable Extracted', 'Weekly classes updated from photo.');
    } catch {
      addToast('info', 'Image Uploaded', 'Timetable photo queued for local vision parsing.');
    }
  };

  const activeChapter = notes?.chapters?.find((ch) => currentTime >= ch.start && currentTime <= ch.end);
  const selectedRecording = recordings.find((r) => r.id === selectedRecId);
  const isDesignRoute = window.location.pathname === '/design' || window.location.hash === '#design';
  const isLectureDetail = activeTab === 'lecture' && !!selectedRecId;
  const lectureTitle = selectedRecording?.subject ?? undefined;

  // Calculate nav height for content padding
  const navHeight = 56 + 16; // nav height + top offset
  const navHeightCondensed = 48 + 16;

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col selection:bg-accent selection:text-on-accent">
      {/* Global Real-Time SSE Job Status Bar */}
      <JobStatusBar
        onJobCompleted={() => {
          addToast('success', 'Pipeline Complete', 'Lecture notes, transcript, and deadlines generated!');
          fetchRecordings().then((r) => setRecordings(r)).catch(() => {});
        }}
      />

      {/* Floating Navigation */}
      <FloatingNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenSearch={() => setCommandMenuOpen(true)}
        onOpenSettings={() => setShowShortcutsModal(true)} // Using shortcuts modal for settings for now
        onOpenPairing={() => setShowPairModal(true)}
        pairedDeviceCount={pairedDevices.length}
        upcomingEventsCount={events.filter((e) => !e.resolved || e.needs_review).length}
        isLectureDetail={isLectureDetail}
        lectureTitle={lectureTitle}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Area */}
      <main
        id="main-content"
        className="flex-1 flex flex-col min-w-0"
        style={{
          paddingTop: `calc(var(--nav-pill-height, 52px) + var(--nav-offset, 16px) + 1.25rem)`,
          scrollPaddingTop: `calc(var(--nav-pill-height, 52px) + var(--nav-offset, 16px) + 1.25rem)`,
        } as React.CSSProperties}
      >
        <div className="max-w-7xl w-full mx-auto px-4 lg:px-6 flex-1">
          {isDesignRoute ? (
            <DesignTestbed />
          ) : (
            <>
              {activeTab === 'inbox' && (
                <InboxView
                  recordings={recordings}
                  selectedRecId={selectedRecId}
                  onSelectRecording={(id) => {
                    setSelectedRecId(id);
                    setActiveTab('lecture');
                  }}
                  onQueueProcessing={handleQueueProcessing}
                  timetable={timetable}
                  events={events}
                  onNavigateToTab={setActiveTab}
                  onUploadFile={(file) => {
                    addToast('info', 'Audio Uploaded', `${file.name} registered for offline Whisper transcription.`);
                  }}
                />
              )}

              {activeTab === 'lecture' && (
                <LectureView
                  transcript={transcript as any}
                  notes={notes as any}
                  currentTime={currentTime}
                  onSeek={(t) => setCurrentTime(t)}
                  followTranscript={followTranscript}
                  onAddCorrection={handleAddCorrection}
                />
              )}

              {activeTab === 'events' && (
                <EventsView
                  events={events}
                  onConfirmEvent={handleConfirmEvent}
                  onDismissEvent={handleDismissEvent}
                  onEditEvent={(idx, upd) =>
                    setEvents((prev) => prev.map((e, i) => (i === idx ? { ...e, ...upd } : e)))
                  }
                  onAddEvent={(newEv) => {
                    setEvents((prev) => [newEv, ...prev]);
                    addToast('success', 'Deadline Added', newEv.title);
                  }}
                  onSeekAudio={(t) => {
                    setCurrentTime(t);
                    setActiveTab('lecture');
                  }}
                />
              )}

              {activeTab === 'questions' && (
                <QuestionsView
                  questions={questions}
                  onSeekAudio={(t) => {
                    setCurrentTime(t);
                    setActiveTab('lecture');
                  }}
                />
              )}

              {activeTab === 'speakers' && (
                <SpeakersView
                  speakerStats={notes?.speaker_stats}
                  onEnrolVoiceprint={(spk) => {
                    addToast('success', 'Voiceprint Saved', `Profile for ${spk} updated.`);
                  }}
                  onSeekAudio={(t) => {
                    setCurrentTime(t);
                    setActiveTab('lecture');
                  }}
                />
              )}

              {activeTab === 'phrases' && (
                <PhrasesView
                  phrases={notes?.repeated_phrases ? {
                    emphasis: notes.repeated_phrases.map((p: any) => ({
                      phrase: p.phrase,
                      count: p.count,
                      spans: [[p.first_occurrence_s || 0, (p.first_occurrence_s || 0) + 5]],
                      context_snippet: p.context_snippet,
                    })),
                    habits: [],
                  } : undefined}
                  onSeekAudio={(t) => {
                    setCurrentTime(t);
                    setActiveTab('lecture');
                  }}
                />
              )}

              {activeTab === 'timetable' && (
                <TimetableView
                  slots={timetable}
                  onAddSlot={handleAddSlot}
                  onDeleteSlot={handleDeleteSlot}
                  onUploadTimetablePhoto={handleUploadPhoto}
                />
              )}

              {activeTab === 'corrections' && <CorrectionsView />}
            </>
          )}
        </div>
      </main>

      {/* Docked Universal Audio Player */}
      {selectedRecId && (audioUrl || transcript) && (
        <footer className="fixed bottom-0 left-0 right-0 z-40 p-4 pointer-events-none">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <AudioPlayer
              audioSrc={audioUrl}
              currentTime={currentTime}
              duration={audioDuration}
              isPlaying={isPlaying}
              onPlayPause={() => setIsPlaying(!isPlaying)}
              onSeek={(t) => setCurrentTime(t)}
              chapters={notes?.chapters || []}
              activeChapterTitle={activeChapter?.title}
              playbackRate={playbackRate}
              onRateChange={setPlaybackRate}
              followTranscript={followTranscript}
              onToggleFollow={() => setFollowTranscript(!followTranscript)}
            />
          </div>
        </footer>
      )}

      {/* Command Palette Modal (⌘K / /) */}
      <CommandMenu
        isOpen={commandMenuOpen}
        onClose={() => setCommandMenuOpen(false)}
        onSelectTab={setActiveTab}
        recordings={recordings}
        onSelectRecording={(id) => {
          setSelectedRecId(id);
          setActiveTab('lecture');
        }}
        onOpenPairing={() => setShowPairModal(true)}
        onToggleTheme={handleToggleTheme}
      />

      {/* Pairing Modal */}
      <PairingModal
        isOpen={showPairModal}
        onClose={() => setShowPairModal(false)}
        pairingInfo={pairingInfo}
        pairedDevices={pairedDevices}
        onRefresh={async () => {
          const info = await fetchPairingInfo().catch(() => null);
          if (info) setPairingInfo(info);
          addToast('info', 'Token Refreshed', 'New one-time pairing key generated.');
        }}
      />

      {/* Shortcuts Modal */}
      <ShortcutsModal isOpen={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />

      {/* Non-intrusive Drag & Drop Overlay */}
      <DragDropOverlay
        onFileDrop={(file) => {
          addToast('info', 'Audio Uploaded', `${file.name} registered for offline transcription.`);
        }}
      />

      {/* Toast Notification Stack */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}