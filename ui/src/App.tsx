import React, { useState, useEffect } from 'react';
import {
  Inbox,
  BookOpen,
  Calendar,
  HelpCircle,
  Users,
  Repeat,
  CalendarDays,
  Edit3,
  Play,
  Pause,
  Clock,
  Download,
  CheckCircle,
  AlertCircle,
  Sparkles,
  QrCode,
  Check,
  Trash2,
  Plus
} from 'lucide-react';
import { Recording, Transcript, Notes, LectureEvent, ImportantQuestion, Phrases, TimetableSlot } from './types';
import {
  fetchHealth,
  fetchRecordings,
  fetchTimetableSlots,
  createTimetableSlot,
  deleteTimetableSlot,
  fetchPairingInfo,
  queueProcessing
} from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'lecture' | 'events' | 'questions' | 'speakers' | 'phrases' | 'timetable' | 'corrections'>('inbox');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [pairingInfo, setPairingInfo] = useState<any>(null);
  const [showPairModal, setShowPairModal] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [phraseTab, setPhraseTab] = useState<'emphasis' | 'habits'>('emphasis');

  // Mock demo transcript & notes for interactive showcase
  const [transcript] = useState<Transcript>({
    asr_model: 'mlx-community/whisper-large-v3-turbo',
    language: 'en',
    segments: [
      {
        start: 0.0,
        end: 8.5,
        speaker: 'PROF_TURING',
        text: "Good morning everyone. Before we begin today's lecture on dynamic programming, I have a few quick administrative announcements.",
        words: []
      },
      {
        start: 8.6,
        end: 18.2,
        speaker: 'PROF_TURING',
        text: "First, pop quiz on Wednesday covering graph algorithms and breadth-first search.",
        words: []
      },
      {
        start: 18.5,
        end: 28.0,
        speaker: 'PROF_TURING',
        text: "Second, assignment 3 deadline is next Friday at 11:59 PM. Please submit your solutions on the course portal.",
        words: []
      },
      {
        start: 28.5,
        end: 37.0,
        speaker: 'PROF_TURING',
        text: "Also remember, the midterm exam will be held on November 12th in the main auditorium.",
        words: []
      },
      {
        start: 38.0,
        end: 49.0,
        speaker: 'PROF_TURING',
        text: "Now, pay attention to this very important question: what is the difference between optimal substructure and overlapping subproblems?",
        words: []
      },
      {
        start: 50.0,
        end: 65.0,
        speaker: 'PROF_TURING',
        text: "Dynamic programming avoids redundant computation by memoizing results of overlapping subproblems.",
        words: []
      },
      {
        start: 65.5,
        end: 72.0,
        speaker: 'STUDENT',
        text: "Professor, how does memoization differ from tabulation?",
        words: []
      },
      {
        start: 72.5,
        end: 85.0,
        speaker: 'PROF_TURING',
        text: "Memoization is top-down using a cache, whereas tabulation is bottom-up iteratively filling a DP table.",
        words: []
      }
    ]
  });

  const [notes] = useState<Notes>({
    overall_summary: "This lecture introduces Dynamic Programming (DP) as an optimization technique over plain recursion. The professor discusses key requirements (optimal substructure, overlapping subproblems) and contrasts top-down memoization with bottom-up tabulation.",
    chapters: [
      {
        title: "Administrative Announcements",
        start: 0.0,
        end: 37.0,
        summary: "Announcements regarding upcoming pop quiz on graphs, Assignment 3 deadline next Friday, and Midterm Exam scheduled on November 12th.",
        key_points: [
          "Pop quiz on Wednesday (graphs, BFS).",
          "Assignment 3 due next Friday at 11:59 PM.",
          "Midterm exam on November 12th in main auditorium."
        ],
        definitions: [],
        examples: [],
        formulas: []
      },
      {
        title: "Dynamic Programming Foundations",
        start: 38.0,
        end: 85.0,
        summary: "Exploration of overlapping subproblems and optimal substructure. Discussion of memoization versus tabulation.",
        key_points: [
          "DP trades space complexity to drastically cut exponential time complexity.",
          "Memoization is top-down recursion with lookup caching.",
          "Tabulation is bottom-up iterative DP table construction."
        ],
        definitions: [
          "Optimal Substructure: Optimal solution to problem contains optimal solutions to subproblems.",
          "Overlapping Subproblems: Same subproblems solved repeatedly in recursion tree."
        ],
        examples: [
          "Computing Fibonacci numbers: O(2^n) recursion reduced to O(n) using DP."
        ],
        formulas: [
          "F(n) = F(n-1) + F(n-2)"
        ]
      }
    ]
  });

  const [events, setEvents] = useState<LectureEvent[]>([
    {
      type: 'quiz',
      title: 'Pop Quiz: Graph Algorithms & BFS',
      date_iso: '2026-10-07',
      date_text: 'on Wednesday',
      resolved: true,
      confidence: 0.95,
      source_quote: 'First, pop quiz on Wednesday covering graph algorithms and breadth-first search.',
      start_s: 8.6,
      needs_review: false
    },
    {
      type: 'assignment_deadline',
      title: 'Assignment 3 Submission',
      date_iso: '2026-10-09',
      date_text: 'next Friday at 11:59 PM',
      resolved: true,
      confidence: 0.90,
      source_quote: 'Second, assignment 3 deadline is next Friday at 11:59 PM.',
      start_s: 18.5,
      needs_review: false
    },
    {
      type: 'exam',
      title: 'Midterm Exam (Main Auditorium)',
      date_iso: '2026-11-12',
      date_text: 'on November 12th',
      resolved: true,
      confidence: 0.98,
      source_quote: 'Also remember, the midterm exam will be held on November 12th in the main auditorium.',
      start_s: 28.5,
      needs_review: false
    }
  ]);

  const [questions] = useState<ImportantQuestion[]>([
    {
      text: 'What is the difference between optimal substructure and overlapping subproblems?',
      start_s: 38.0,
      reason: 'teacher_flagged'
    },
    {
      text: 'Professor, how does memoization differ from tabulation?',
      start_s: 65.5,
      reason: 'posed_to_class'
    }
  ]);

  const [phrases] = useState<Phrases>({
    emphasis: [
      {
        phrase: 'dynamic programming',
        count: 5,
        spans: [[0.0, 8.5], [50.0, 65.0], [72.5, 85.0]]
      },
      {
        phrase: 'overlapping subproblems',
        count: 3,
        spans: [[38.0, 49.0], [50.0, 65.0]]
      },
      {
        phrase: 'optimal substructure',
        count: 2,
        spans: [[38.0, 49.0]]
      }
    ],
    habits: [
      { phrase: 'okay so', count: 4 },
      { phrase: 'you know', count: 3 },
      { phrase: 'basically', count: 2 }
    ]
  });

  useEffect(() => {
    fetchRecordings().then(setRecordings).catch(() => {});
    fetchTimetableSlots().then(setTimetable).catch(() => {});
    fetchPairingInfo().then(setPairingInfo).catch(() => {});
  }, []);

  const exportICS = () => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//LectureWhisper//EN\n";
    events.forEach((ev) => {
      const d = ev.date_iso ? ev.date_iso.replace(/-/g, '') : '20261015';
      icsContent += `BEGIN:VEVENT\nSUMMARY:${ev.title}\nDTSTART;VALUE=DATE:${d}\nDESCRIPTION:${ev.source_quote}\nEND:VEVENT\n`;
    });
    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'lecture_events.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎙️</span>
              <span className="font-bold tracking-tight text-lg text-white">Lecture Whisper</span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
              LOCAL
            </span>
          </div>

          <nav className="p-3 space-y-1">
            {[
              { id: 'inbox', label: 'Inbox', icon: Inbox },
              { id: 'lecture', label: 'Lecture View', icon: BookOpen },
              { id: 'events', label: 'Events & Deadlines', icon: Calendar, badge: events.length },
              { id: 'questions', label: 'Important Questions', icon: HelpCircle },
              { id: 'speakers', label: 'Speaker Stats', icon: Users },
              { id: 'phrases', label: 'Repeated Phrases', icon: Repeat },
              { id: 'timetable', label: 'Timetable', icon: CalendarDays },
              { id: 'corrections', label: 'Corrections (Train)', icon: Edit3 },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isActive ? 'bg-blue-800 text-white' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Pairing info footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <button
            onClick={() => setShowPairModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition"
          >
            <QrCode className="w-3.5 h-3.5 text-blue-400" />
            Pair Phone (QR)
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto">
        {/* Top Header */}
        <header className="h-14 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-white capitalize">{activeTab.replace('_', ' ')}</h1>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">CS 101: Data Structures & Algorithms</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-full text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              M4 Max GPU • 36 GB Unified
            </div>
          </div>
        </header>

        {/* View Switcher */}
        <div className="p-6">
          {activeTab === 'inbox' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Recordings Inbox</h2>
                  <p className="text-sm text-slate-400">Uploads synced from Pixel 8a or processed locally.</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800/50 text-xs text-slate-400 uppercase border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3">Lecture Subject</th>
                      <th className="px-5 py-3">Recorded At</th>
                      <th className="px-5 py-3">Duration</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    <tr className="hover:bg-slate-800/30">
                      <td className="px-5 py-4 font-medium text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                          DP
                        </div>
                        <div>
                          <div>CS 101: Dynamic Programming</div>
                          <div className="text-xs text-slate-500">Device: Pixel 8a (Android 17)</div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-400">Today, 9:00 AM</td>
                      <td className="px-5 py-4">1h 25m</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400">
                          <CheckCircle className="w-3 h-3" /> Completed
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setActiveTab('lecture')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg shadow transition"
                        >
                          Open Lecture
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'lecture' && (
            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-120px)]">
              {/* Left Column: Synchronized Audio Player + Transcript */}
              <div className="col-span-7 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {/* Audio Bar */}
                <div className="p-4 border-b border-slate-800 bg-slate-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 transition shadow"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div>
                      <div className="text-sm font-semibold text-white">CS101-Lecture-04.wav</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>{currentTime.toFixed(1)}s / 85.0s</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 bg-slate-800 rounded text-slate-300">1.0x</span>
                    <span className="px-2 py-1 bg-slate-800 rounded text-slate-300">16kHz Mono</span>
                  </div>
                </div>

                {/* Transcript stream */}
                <div className="flex-1 p-5 overflow-y-auto space-y-4">
                  {transcript.segments.map((seg, idx) => {
                    const isProf = seg.speaker === 'PROF_TURING';
                    const isCurrent = currentTime >= seg.start && currentTime <= seg.end;
                    return (
                      <div
                        key={idx}
                        onClick={() => setCurrentTime(seg.start)}
                        className={`p-3 rounded-xl border transition cursor-pointer ${
                          isCurrent
                            ? 'bg-blue-600/10 border-blue-500 shadow'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                              isProf ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {isProf ? '👨‍🏫 Lecturer (Prof. Turing)' : '🙋 Student'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed">{seg.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Structured Notes & Chapters */}
              <div className="col-span-5 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-sm text-white">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    AI-Generated Lecture Notes
                  </div>
                  <span className="text-xs text-slate-400">Qwen 2.5 7B (Local)</span>
                </div>

                <div className="flex-1 p-5 overflow-y-auto space-y-6">
                  {/* Summary card */}
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Overall Summary</h3>
                    <p className="text-sm text-slate-300 leading-relaxed">{notes.overall_summary}</p>
                  </div>

                  {/* Chapters */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Chapters</h3>
                    {notes.chapters.map((ch, idx) => (
                      <div
                        key={idx}
                        onClick={() => setCurrentTime(ch.start)}
                        className="p-4 bg-slate-950 rounded-xl border border-slate-800 hover:border-slate-700 transition cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold text-white">{ch.title}</h4>
                          <span className="text-xs text-blue-400 font-mono font-semibold">
                            {ch.start.toFixed(0)}s - {ch.end.toFixed(0)}s
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-3">{ch.summary}</p>

                        <div className="space-y-1.5">
                          {ch.key_points.map((pt, pidx) => (
                            <div key={pidx} className="flex items-start gap-2 text-xs text-slate-300">
                              <span className="text-blue-500 mt-0.5">•</span>
                              <span>{pt}</span>
                            </div>
                          ))}
                        </div>

                        {ch.formulas.length > 0 && (
                          <div className="mt-3 p-2.5 bg-slate-900 rounded border border-slate-800 font-mono text-xs text-emerald-400">
                            {ch.formulas.join('; ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Extracted Events & Deadlines</h2>
                  <p className="text-sm text-slate-400">Dates resolved against recording start time. Ambiguous items flagged for review.</p>
                </div>
                <button
                  onClick={exportICS}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow transition"
                >
                  <Download className="w-3.5 h-3.5" /> Export Calendar (.ics)
                </button>
              </div>

              <div className="grid grid-cols-3 gap-5">
                {events.map((ev, idx) => (
                  <div
                    key={idx}
                    className={`p-5 rounded-xl border flex flex-col justify-between ${
                      ev.needs_review
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                          ev.type === 'exam'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : ev.type === 'quiz'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {ev.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-mono text-slate-400">{ev.date_iso || 'Date Pending'}</span>
                      </div>

                      <h3 className="text-base font-bold text-white mb-2">{ev.title}</h3>
                      <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg border border-slate-800/80 mb-4 italic">
                        "{ev.source_quote}"
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                      <span className="text-slate-400">Confidence: {(ev.confidence * 100).toFixed(0)}%</span>
                      <div className="flex items-center gap-2">
                        <button className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium">
                          Edit
                        </button>
                        <button className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium">
                          Confirm
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Important Questions</h2>
                <p className="text-sm text-slate-400">Questions flagged by the lecturer, posed to the class, or repeated for emphasis.</p>
              </div>

              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <HelpCircle className="w-5 h-5 text-blue-400 shrink-0" />
                      <div>
                        <div className="text-sm font-semibold text-white">{q.text}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Spoken at {q.start_s.toFixed(1)}s</div>
                      </div>
                    </div>

                    <span className="text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {q.reason.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'speakers' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Speaker Panel</h2>
                <p className="text-sm text-slate-400">Diarization and talk-time distribution. Lecturer automatically identified.</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl">
                  <h3 className="text-sm font-bold text-white mb-4">Talk-Time Distribution</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span>PROF_TURING (Lecturer)</span>
                        <span>85% (1h 12m)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: '85%' }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span>STUDENTS / AUDIENCE</span>
                        <span>15% (13m)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: '15%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-2">Voiceprint Enrolment</h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Enrol a 5–30 second voice sample for this subject to automatically tag the lecturer regardless of audience talk-time.
                    </p>
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300">
                      Enrolled profile: <span className="text-emerald-400 font-semibold">Prof. Turing (Active)</span>
                    </div>
                  </div>

                  <button className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition border border-slate-700">
                    Re-enrol Voiceprint
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'phrases' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Repeated Phrase Analysis</h2>
                <p className="text-sm text-slate-400">Distinguishes stressed core concepts from unconscious verbal habits.</p>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setPhraseTab('emphasis')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                    phraseTab === 'emphasis'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  Stressed Content Emphasis ({phrases.emphasis.length})
                </button>
                <button
                  onClick={() => setPhraseTab('habits')}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
                    phraseTab === 'habits'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  Verbal Habits & Fillers ({phrases.habits.length})
                </button>
              </div>

              {phraseTab === 'emphasis' ? (
                <div className="grid grid-cols-3 gap-4">
                  {phrases.emphasis.map((item, idx) => (
                    <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-white capitalize">{item.phrase}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">
                          {item.count}x
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Spans: {item.spans.map((s) => `${s[0].toFixed(0)}s`).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {phrases.habits.map((item, idx) => (
                    <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-300 capitalize">"{item.phrase}"</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold">
                          {item.count}x
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">Verbal filler tic</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'timetable' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Weekly Timetable</h2>
                  <p className="text-sm text-slate-400">Class schedule used by phone alarms and scheduled recording services.</p>
                </div>
                <button className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow transition">
                  <Plus className="w-3.5 h-3.5" /> Add Class Slot
                </button>
              </div>

              <div className="grid grid-cols-5 gap-4">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day, dIdx) => (
                  <div key={day} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
                    <div className="font-bold text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 mb-3">
                      {day}
                    </div>
                    <div className="space-y-3 flex-1">
                      {dIdx === 0 && (
                        <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-lg">
                          <div className="text-xs font-bold text-blue-300">CS 101: Algorithms</div>
                          <div className="text-[11px] text-slate-400">09:00 - 10:30</div>
                          <div className="text-[10px] text-slate-500 mt-1">Hall B • Prof. Turing</div>
                        </div>
                      )}
                      {dIdx === 2 && (
                        <div className="p-3 bg-purple-950/40 border border-purple-800/50 rounded-lg">
                          <div className="text-xs font-bold text-purple-300">MATH 201: Linear Algebra</div>
                          <div className="text-[11px] text-slate-400">11:00 - 12:30</div>
                          <div className="text-[10px] text-slate-500 mt-1">Room 402 • Dr. Euler</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'corrections' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Corrections & Training Data Loop</h2>
                <p className="text-sm text-slate-400">
                  Edits made here or in Lecture View are saved as gold training examples for Phase 8 adapter fine-tuning.
                </p>
              </div>

              <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                <h3 className="text-sm font-semibold text-white">Submit a Correction</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Original Model Output (Transcript/Notes)</label>
                    <textarea
                      rows={4}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                      placeholder="Paste text with ASR error or bad note summary..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Corrected Text</label>
                    <textarea
                      rows={4}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                      placeholder="Your hand-corrected ground truth text..."
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition shadow">
                    Save as Training Pair
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Pairing QR Modal */}
      {showPairModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center">
            <h3 className="text-lg font-bold text-white mb-1">Pair Mobile App</h3>
            <p className="text-xs text-slate-400 mb-4">
              Open Lecture Whisper on your Pixel 8a and scan this QR code to securely link your device.
            </p>

            <div className="bg-white p-4 rounded-xl inline-block mb-4">
              {/* QR display placeholder */}
              <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-800 font-mono text-xs">
                QR CODE READY
              </div>
            </div>

            <div className="text-xs text-slate-500 mb-5 font-mono">
              Server ID: {pairingInfo?.server_id || 'localhost'}
            </div>

            <button
              onClick={() => setShowPairModal(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
