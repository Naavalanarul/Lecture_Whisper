import { LectureEvent, Notes } from '../types';

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return 'Unscheduled';
  try {
    const trimmed = isoString.trim();
    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const year = parseInt(dateOnlyMatch[1], 10);
      const month = parseInt(dateOnlyMatch[2], 10) - 1;
      const day = parseInt(dateOnlyMatch[3], 10);
      const localDate = new Date(year, month, day);
      return localDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }

    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return isoString;

    if (!trimmed.includes('T') && !trimmed.includes(':')) {
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }

    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString || 'Unscheduled';
  }
}

export function formatRelative(isoString: string | null | undefined): string {
  if (!isoString) return '';
  try {
    const trimmed = isoString.trim();
    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const year = parseInt(dateOnlyMatch[1], 10);
      const month = parseInt(dateOnlyMatch[2], 10) - 1;
      const day = parseInt(dateOnlyMatch[3], 10);
      const targetDate = new Date(year, month, day);
      const today = new Date();
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const diffMs = targetDate.getTime() - todayDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays === -1) return 'Yesterday';
      if (diffDays > 1) return `in ${diffDays} days`;
      return `${Math.abs(diffDays)} days ago`;
    }

    const d = new Date(trimmed);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 1) return `in ${diffDays} days`;
    return `${Math.abs(diffDays)} days ago`;
  } catch {
    return '';
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  }
}

export function downloadICS(event: LectureEvent, subject = 'Academic Lecture'): void {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDateICS = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

  const now = formatDateICS(new Date());
  const trimmed = (event.date_iso || '').trim();
  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  let dtStartLine = '';
  let dtEndLine = '';

  if (dateOnlyMatch) {
    const y = dateOnlyMatch[1];
    const m = dateOnlyMatch[2];
    const d = dateOnlyMatch[3];
    dtStartLine = `DTSTART;VALUE=DATE:${y}${m}${d}`;
    // Next day for all-day event per RFC 5545
    const nextDay = new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10) + 1));
    const nextY = nextDay.getUTCFullYear();
    const nextM = pad(nextDay.getUTCMonth() + 1);
    const nextD = pad(nextDay.getUTCDate());
    dtEndLine = `DTEND;VALUE=DATE:${nextY}${nextM}${nextD}`;
  } else {
    const dt = event.date_iso ? new Date(event.date_iso) : new Date(Date.now() + 86400000 * 3);
    dtStartLine = `DTSTART:${formatDateICS(dt)}`;
    dtEndLine = `DTEND:${formatDateICS(new Date(dt.getTime() + 3600000))}`;
  }

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lecture Whisper//Local Academic Notes//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:lw-${Date.now()}@lecturewhisper.local`,
    `DTSTAMP:${now}`,
    dtStartLine,
    dtEndLine,
    `SUMMARY:[${subject}] ${event.title}`,
    `DESCRIPTION:${event.source_quote || 'Detected from lecture recording.'}\\n\\nType: ${event.type}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadAllICS(events: LectureEvent[], subject = 'Academic Deadlines'): void {
  if (!events || events.length === 0) return;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatDateICS = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

  const now = formatDateICS(new Date());

  const vevents = events.map((ev, idx) => {
    const trimmed = (ev.date_iso || '').trim();
    const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    let dtStartLine = '';
    let dtEndLine = '';

    if (dateOnlyMatch) {
      const y = dateOnlyMatch[1];
      const m = dateOnlyMatch[2];
      const d = dateOnlyMatch[3];
      dtStartLine = `DTSTART;VALUE=DATE:${y}${m}${d}`;
      const nextDay = new Date(Date.UTC(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10) + 1));
      const nextY = nextDay.getUTCFullYear();
      const nextM = pad(nextDay.getUTCMonth() + 1);
      const nextD = pad(nextDay.getUTCDate());
      dtEndLine = `DTEND;VALUE=DATE:${nextY}${nextM}${nextD}`;
    } else {
      const dt = ev.date_iso ? new Date(ev.date_iso) : new Date(Date.now() + 86400000 * (idx + 1));
      dtStartLine = `DTSTART:${formatDateICS(dt)}`;
      dtEndLine = `DTEND:${formatDateICS(new Date(dt.getTime() + 3600000))}`;
    }

    return [
      'BEGIN:VEVENT',
      `UID:lw-${Date.now()}-${idx}@lecturewhisper.local`,
      `DTSTAMP:${now}`,
      dtStartLine,
      dtEndLine,
      `SUMMARY:${ev.title}`,
      `DESCRIPTION:${ev.source_quote || 'Academic event detected from lecture.'}\\n\\nType: ${ev.type}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
    ].join('\r\n');
  });

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lecture Whisper//Local Academic Notes//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...vevents,
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${subject.replace(/[^a-zA-Z0-9_-]/g, '_')}_calendar.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadMarkdown(notes: Notes, title: string): void {
  const lines: string[] = [
    `# ${title}`,
    `*Generated by Lecture Whisper — Local Academic AI*`,
    '',
    '## Executive Summary',
    notes.overall_summary,
    '',
    '---',
    '',
  ];

  notes.chapters.forEach((ch, idx) => {
    lines.push(`### Chapter ${idx + 1}: ${ch.title} (${formatTime(ch.start)} - ${formatTime(ch.end)})`);
    lines.push('');
    lines.push(ch.summary);
    lines.push('');

    if (ch.key_points && ch.key_points.length > 0) {
      lines.push('#### Key Takeaways');
      ch.key_points.forEach((kp) => lines.push(`- ${kp}`));
      lines.push('');
    }

    if (ch.definitions && ch.definitions.length > 0) {
      lines.push('#### Definitions');
      ch.definitions.forEach((d) => lines.push(`> 📘 **Definition:** ${d}`));
      lines.push('');
    }

    if (ch.formulas && ch.formulas.length > 0) {
      lines.push('#### Formulas & Mathematical Derivations');
      ch.formulas.forEach((f) => lines.push(`\`\`\`text\n${f}\n\`\`\``));
      lines.push('');
    }

    if (ch.examples && ch.examples.length > 0) {
      lines.push('#### Examples');
      ch.examples.forEach((ex) => lines.push(`*Example:* ${ex}`));
      lines.push('');
    }
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_notes.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
