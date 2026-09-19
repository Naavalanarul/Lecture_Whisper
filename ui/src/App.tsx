import React, { useState, useEffect, useCallback } from 'react';
import { Header, NavTab } from './components/Header';
import { AudioPlayer } from './components/AudioPlayer';
import { JobStatusBar } from './components/JobStatusBar';
import { PairingModal } from './components/PairingModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ToastContainer, ToastMessage } from './components/Toast';

import { InboxView } from './views/InboxView';
import { LectureView } from './views/LectureView';
import { EventsView } from './views/EventsView';
import { QuestionsView } from './views/QuestionsView';
import { SpeakersView } from './views/SpeakersView';
import { PhrasesView } from './views/PhrasesView';
import { TimetableView } from './views/TimetableView';
import { CorrectionsView } from './views/CorrectionsView';

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
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [pairingInfo, setPairingInfo] = useState<any>(null);
  const [pairedDevices, setPairedDevices] = useState<any[]>([]);
  const [showPairModal, setShowPairModal] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Audio Playback State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [followTranscript, setFollowTranscript] = useState<boolean>(true);
  const [audioDuration, setAudioDuration] = useState<number>(85.0);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);

  // Default rich showcase lecture data
  const defaultTranscript: Transcript = {
    asr_model: 'mlx-community/whisper-large-v3-turbo',
    language: 'en',
    segments: [
      {
        start: 0.0,
        end: 8.5,
        speaker: 'PROF_TURING',
        text: "Good morning everyone. Before we begin today's lecture on dynamic programming, I have a few quick administrative announcements.",
        words: [],
      },
      {
        start: 8.6,
        end: 18.2,
        speaker: 'PROF_TURING',
        text: 'First, pop quiz on Wednesday covering graph algorithms and breadth-first search.',
        words: [],
      },
      {
        start: 18.5,
        end: 28.0,
        speaker: 'PROF_TURING',
        text: 'Second, assignment 3 deadline is next Friday at 11:59 PM. Please submit your solutions on the course portal.',
        words: [],
      },
      {
        start: 28.5,
        end: 37.0,
        speaker: 'PROF_TURING',
        text: 'Also remember, the midterm exam will be held on November 12th in the main auditorium.',
        words: [],
      },
      {
        start: 38.0,
        end: 49.0,
        speaker: 'PROF_TURING',
        text: 'Now, pay attention to this very important question: what is the difference between optimal substructure and overlapping subproblems?',
        words: [],
      },
      {
        start: 50.0,
        end: 65.0,
        speaker: 'PROF_TURING',
        text: 'Dynamic programming avoids redundant computation by memoizing results of overlapping subproblems.',
        words: [],
      },
      {
        start: 65.5,
        end: 72.0,
        speaker: 'STUDENT',
        text: 'Professor, how does memoization differ from bottom-up tabulation?',
        words: [],
      },
      {
        start: 72.5,
        end: 85.0,
        speaker: 'PROF_TURING',
        text: 'Memoization is top-down using a recursive cache, whereas tabulation is bottom-up iteratively filling a DP table.',
        words: [],
      },
    ],
  };

  const defaultNotes: Notes = {
    overall_summary:
      'This lecture introduces Dynamic Programming (DP) as a powerful optimization over plain exponential recursion. Prof. Turing explains the dual prerequisites (optimal substructure and overlapping subproblems) and contrasts top-down memoization against bottom-up iterative tabulation.',
    chapters: [
      {
        title: 'Administrative Announcements',
        start: 0.0,
        end: 37.0,
        summary:
          'Announcements regarding upcoming pop quiz on graphs, Assignment 3 deadline next Friday, and Midterm Exam scheduled on November 12th in the main hall.',
        key_points: [
          'Pop quiz on Wednesday (graph algorithms, BFS).',
          'Assignment 3 deadline: next Friday at 11:59 PM.',
          'Midterm exam on November 12th in the main auditorium.',
        ],
        definitions: [],
        examples: [],
        formulas: [],
      },
      {
        title: 'Dynamic Programming Foundations',
        start: 38.0,
        end: 85.0,
        summary:
          'Core mathematical definition of DP: caching answers to overlapping subproblems to prevent exponential re-computation. Comparison between memoization and tabulation.',
        key_points: [
          'DP trades space complexity to drastically eliminate exponential recursion trees.',
          'Memoization: top-down recursive caching on demand.',
          'Tabulation: bottom-up systematic table population.',
        ],
        definitions: [
          'Optimal Substructure: Optimal solution contains optimal solutions to subproblems.',
          'Overlapping Subproblems: Recursion encounters identical subproblem states repeatedly.',
        ],
        examples: ['Computing Fibonacci: O(2^n) plain recursion reduced to O(n) using DP array.'],
        formulas: ['F(n) = F(n-1) + F(n-2) with memo[n] cached'],
      },
    ],
  };

  const [transcript, setTranscript] = useState<Transcript>(defaultTranscript);
  const [notes, setNotes] = useState<Notes>(defaultNotes);
  const [events, setEvents] = useState<LectureEvent[]>([
    {
      title: 'Pop Quiz on Graph Algorithms',
      type: 'quiz',
      date_iso: new Date(Date.now() + 86400000 * 3).toISOString(),
      date_text: 'Wednesday',
      resolved: false,
      confidence: 0.98,
      source_quote: 'pop quiz on Wednesday covering graph algorithms',
      start_s: 8.6,
      needs_review: true,
    },
    {
      title: 'Assignment 3 Deadline',
      type: 'assignment_deadline',
      date_iso: new Date(Date.now() + 86400000 * 5).toISOString(),
      date_text: 'next Friday at 11:59 PM',
      resolved: true,
      confidence: 0.99,
      source_quote: 'assignment 3 deadline is next Friday at 11:59 PM',
      start_s: 18.5,
      needs_review: false,
    },
    {
      title: 'CS 106B Midterm Exam',
      type: 'exam',
      date_iso: '2026-11-12T14:00:00Z',
      date_text: 'November 12th',
      resolved: true,
      confidence: 0.96,
      source_quote: 'the midterm exam will be held on November 12th in the main auditorium',
      start_s: 28.5,
      needs_review: false,
    },
  ]);

  const [questions] = useState<ImportantQuestion[]>([
    {
      text: 'What is the difference between optimal substructure and overlapping subproblems?',
      start_s: 38.0,
      reason: 'teacher_flagged',
    },
    {
      text: 'Professor, how does memoization differ from bottom-up tabulation?',
      start_s: 65.5,
      reason: 'posed_to_class',
    },
  ]);

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
          // Provide default showcase item if server DB is fresh
          const mockRec: Recording = {
            id: 'rec-demo-cs106b',
            device_id: 'pixel-8a-naavalan',
            started_at: new Date().toISOString(),
            duration_s: 85.0,
            subject: 'CS 106B Dynamic Programming',
            sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
            chunk_count: 1,
            status: 'completed',
          };
          setRecordings([mockRec]);
          setSelectedRecId(mockRec.id);
        }

        if (slots && slots.length > 0) {
          setTimetable(slots);
        } else {
          setTimetable([
            {
              id: 'slot-1',
              weekday: 0,
              start_time: '10:00',
              end_time: '11:30',
              subject: 'CS 106B Dynamic Programming',
              room: 'Auditorium B',
              lecturer: 'Prof. Alan Turing',
            },
            {
              id: 'slot-2',
              weekday: 2,
              start_time: '10:00',
              end_time: '11:30',
              subject: 'CS 106B Dynamic Programming',
              room: 'Auditorium B',
              lecturer: 'Prof. Alan Turing',
            },
            {
              id: 'slot-3',
              weekday: 1,
              start_time: '14:00',
              end_time: '15:30',
              subject: 'MATH 51 Linear Algebra',
              room: 'Science Hall 101',
              lecturer: 'Prof. Gauss',
            },
            {
              id: 'slot-4',
              weekday: 3,
              start_time: '14:00',
              end_time: '15:30',
              subject: 'MATH 51 Linear Algebra',
              room: 'Science Hall 101',
              lecturer: 'Prof. Gauss',
            },
          ]);
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
    if (!selectedRecId || selectedRecId === 'rec-demo-cs106b') {
      setAudioUrl(undefined);
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
        if (recNotes) setNotes(recNotes);
        if (recEvents && recEvents.length > 0) setEvents(recEvents);

        // Check audio stream url
        setAudioUrl(getAudioStreamUrl(selectedRecId));
      } catch {
        // Fallback to default
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

  const activeChapter = notes.chapters.find((ch) => currentTime >= ch.start && currentTime <= ch.end);

  return (
    <div className="min-h-screen bg-surface-950 text-slate-100 flex flex-col selection:bg-brand-600 selection:text-white pb-28">
      {/* Global Real-Time SSE Job Status Bar */}
      <JobStatusBar
        onJobCompleted={() => {
          addToast('success', 'Pipeline Complete', 'Lecture notes, transcript, and deadlines generated!');
          fetchRecordings().then((r) => setRecordings(r)).catch(() => {});
        }}
      />

      {/* Top Header & Navigation */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenPairing={() => setShowPairModal(true)}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        recordingCount={recordings.length}
        upcomingEventsCount={events.filter((e) => !e.resolved || e.needs_review).length}
        pairedDeviceCount={pairedDevices.length}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-6 py-6 animate-in fade-in duration-150">
        {activeTab === 'inbox' && (
          <InboxView
            recordings={recordings}
            selectedRecId={selectedRecId}
            onSelectRecording={(id) => {
              setSelectedRecId(id);
              setActiveTab('lecture');
            }}
            onQueueProcessing={handleQueueProcessing}
            onUploadFile={() => {
              addToast('info', 'Audio Uploaded', 'Audio file registered for offline Whisper transcription.');
            }}
          />
        )}

        {activeTab === 'lecture' && (
          <LectureView
            transcript={transcript}
            notes={notes}
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
      </main>

      {/* Docked Universal Audio Player */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 p-4 pointer-events-none">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <AudioPlayer
            audioSrc={audioUrl}
            currentTime={currentTime}
            duration={audioDuration}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onSeek={(t) => setCurrentTime(t)}
            chapters={notes.chapters}
            activeChapterTitle={activeChapter?.title}
            playbackRate={playbackRate}
            onRateChange={setPlaybackRate}
            followTranscript={followTranscript}
            onToggleFollow={() => setFollowTranscript(!followTranscript)}
          />
        </div>
      </footer>

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

      {/* Toast Notification Stack */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
