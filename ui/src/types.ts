/** Data contracts for Lecture Whisper web dashboard. */

export interface Word {
  w: string;
  start: number;
  end: number;
  conf: number;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  speaker: string;
  text: string;
  words: Word[];
}

export interface Transcript {
  segments: TranscriptSegment[];
  asr_model: string;
  language: string;
}

export interface SpeakerInfo {
  id: string;
  talk_time_s: number;
  share: number;
  is_lecturer: boolean;
  method: 'talk_time' | 'voiceprint';
  confidence: number;
}

export interface SpeakerStats {
  speakers: SpeakerInfo[];
}

export interface ChapterNotes {
  title: string;
  start: number;
  end: number;
  summary: string;
  key_points: string[];
  definitions: string[];
  examples: string[];
  formulas: string[];
}

export interface Notes {
  chapters: ChapterNotes[];
  overall_summary: string;
}

export type EventType =
  | 'quiz'
  | 'seminar'
  | 'assignment_deadline'
  | 'exam'
  | 'project'
  | 'schedule_change'
  | 'other';

export interface LectureEvent {
  id?: string;
  type: EventType;
  title: string;
  date_iso: string | null;
  date_text: string;
  resolved: boolean;
  confidence: number;
  source_quote: string;
  start_s: number;
  needs_review: boolean;
}

export interface ImportantQuestion {
  text: string;
  start_s: number;
  reason: 'teacher_flagged' | 'posed_to_class' | 'repeated';
}

export interface EmphasisPhrase {
  phrase: string;
  count: number;
  spans: [number, number][];
}

export interface HabitPhrase {
  phrase: string;
  count: number;
}

export interface Phrases {
  emphasis: EmphasisPhrase[];
  habits: HabitPhrase[];
}

export interface TimetableSlot {
  id: string;
  weekday: number; // 0 = Mon, 6 = Sun
  start_time: string;
  end_time: string;
  subject: string;
  room?: string;
  lecturer?: string;
  timetable_group_id?: string;
}

export interface Recording {
  id: string;
  device_id: string;
  started_at: string;
  duration_s: number;
  subject?: string;
  sha256: string;
  chunk_count: number;
  status: 'uploading' | 'queued' | 'processing' | 'completed' | 'failed' | 'uploaded';
}

export interface JobProgress {
  job_id: string;
  recording_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stage?: string;
  progress: number;
  error?: string;
  updated_at: string;
}
