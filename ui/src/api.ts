/** API client for Lecture Whisper backend. */

import { Notes, Recording, TimetableSlot, Transcript } from './types';

const BASE_URL = '/api';

export async function fetchHealth(): Promise<{ status: string; service: string }> {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}

export async function fetchSystemMode(): Promise<{ demo_mode: boolean; version: string }> {
  try {
    const res = await fetch(`${BASE_URL}/system/mode`);
    if (!res.ok) return { demo_mode: false, version: '1.0.0' };
    return res.json();
  } catch {
    return { demo_mode: false, version: '1.0.0' };
  }
}

export async function fetchRecordings(): Promise<Recording[]> {
  const res = await fetch(`${BASE_URL}/recordings/`);
  return res.json();
}

export async function fetchRecording(id: string): Promise<Recording> {
  const res = await fetch(`${BASE_URL}/recordings/${id}`);
  if (!res.ok) throw new Error('Recording not found');
  return res.json();
}

export async function fetchTranscript(id: string): Promise<Transcript> {
  const res = await fetch(`${BASE_URL}/recordings/${id}/transcript`);
  if (!res.ok) throw new Error('Transcript not found');
  const data = await res.json();
  return data.transcript;
}

export async function fetchNotes(id: string): Promise<Notes> {
  const res = await fetch(`${BASE_URL}/recordings/${id}/notes`);
  if (!res.ok) throw new Error('Notes not found');
  const data = await res.json();
  return data.notes;
}

export async function queueProcessing(id: string): Promise<{ job_id: string; status: string }> {
  const res = await fetch(`${BASE_URL}/recordings/${id}/process`, { method: 'POST' });
  return res.json();
}

export async function fetchJobs(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/jobs/`);
  return res.json();
}

export async function fetchTimetableSlots(): Promise<TimetableSlot[]> {
  const res = await fetch(`${BASE_URL}/timetable/slots`);
  return res.json();
}

export async function createTimetableSlot(slot: Omit<TimetableSlot, 'id'>): Promise<TimetableSlot> {
  const res = await fetch(`${BASE_URL}/timetable/slots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slot),
  });
  return res.json();
}

export async function deleteTimetableSlot(id: string): Promise<{ status: string }> {
  const res = await fetch(`${BASE_URL}/timetable/slots/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function fetchPairingInfo(): Promise<{
  host: string;
  port: number;
  token: string;
  code_6digit?: string;
  server_id: string;
  cert_fingerprint?: string;
  pairing_uri?: string;
  expires_in?: number;
}> {
  const res = await fetch(`${BASE_URL}/pairing/info`);
  return res.json();
}

export async function fetchPairedDevices(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/pairing/devices`);
  return res.json();
}

export async function unpairDevice(deviceId: string): Promise<{ status: string }> {
  const res = await fetch(`${BASE_URL}/pairing/devices/${deviceId}`, { method: 'DELETE' });
  return res.json();
}

export function getAudioStreamUrl(recordingId: string): string {
  return `${BASE_URL}/recordings/${recordingId}/audio`;
}

export async function fetchRecordingEvents(recordingId: string): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/recordings/${recordingId}/events`);
  if (!res.ok) return [];
  return res.json();
}

export async function updateRecordingEvent(
  recordingId: string,
  eventId: string,
  data: { resolved?: boolean; needs_review?: boolean; title?: string; date_iso?: string }
): Promise<any> {
  const res = await fetch(`${BASE_URL}/recordings/${recordingId}/events/${eventId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function fetchCorrections(recordingId: string): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/recordings/${recordingId}/corrections`);
  if (!res.ok) return [];
  return res.json();
}

export async function addCorrection(
  recordingId: string,
  field: string,
  originalValue: string,
  correctedValue: string
): Promise<any> {
  const res = await fetch(`${BASE_URL}/recordings/${recordingId}/corrections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      field,
      original_value: originalValue,
      corrected_value: correctedValue,
    }),
  });
  return res.json();
}

export async function uploadTimetableImage(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${BASE_URL}/timetable/extract`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

