/** API client for Lecture Whisper backend. */

import { Notes, Recording, TimetableSlot, Transcript } from './types';

const BASE_URL = '/api';

export async function fetchHealth(): Promise<{ status: string; service: string }> {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
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

export async function fetchPairingInfo(): Promise<{ host: string; port: number; token: string; server_id: string }> {
  const res = await fetch(`${BASE_URL}/pairing/info`);
  return res.json();
}

export async function fetchPairedDevices(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/pairing/devices`);
  return res.json();
}
