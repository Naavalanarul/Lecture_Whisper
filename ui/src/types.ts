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
  speakers?: SpeakerInfo[];
  lecturer_speaker_id?: string;
  speaker_distribution?: Record<string, number>;
  talk_times?: Record<string, number>;
  total_speech_time_s?: number;
  total_duration_s?: number;
  silence_time_s?: number;
  discrepancy_detected?: boolean;
  wpm?: Record<string, number>;
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
  summary?: string;
  key_concepts?: string[];
  important_questions?: ImportantQuestion[];
  speaker_stats?: SpeakerStats;
  repeated_phrases?: HabitPhrase[];
  action_items?: string[];
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
  candidate_dates?: string[];
}

export interface ImportantQuestion {
  text: string;
  start_s: number;
  end_s?: number;
  reason: 'teacher_flagged' | 'posed_to_class' | 'repeated';
  answer_text?: string | null;
  answer_start_s?: number | null;
  transcript_snippet?: string | null;
  lecturer_self_answered?: boolean;
  student_asked?: boolean;
}

export interface EmphasisPhrase {
  phrase: string;
  count: number;
  spans: [number, number][];
  context_snippet?: string;
  first_occurrence_s?: number;
  last_occurrence_s?: number;
  mean_inter_arrival_s?: number;
  description?: string;
}

export interface HabitPhrase {
  phrase: string;
  count: number;
  first_occurrence_s?: number;
  last_occurrence_s?: number;
  mean_inter_arrival_s?: number;
  context_snippet?: string;
  description?: string;
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
