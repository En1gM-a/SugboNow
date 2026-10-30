// Shared display formatting helpers. All times are shown in Asia/Manila.

const TZ = 'Asia/Manila';

const timeFmt = new Intl.DateTimeFormat('en-PH', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
const hourFmt = new Intl.DateTimeFormat('en-PH', { timeZone: TZ, hour: 'numeric' });
const longDateFmt = new Intl.DateTimeFormat('en-PH', { timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric' });
const shortDateFmt = new Intl.DateTimeFormat('en-PH', { timeZone: TZ, month: 'short', day: 'numeric' });
const hourOfDayFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' });
const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const compactFmt = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

export function formatTime(iso: string | Date): string {
  return timeFmt.format(new Date(iso));
}

export function formatHour(iso: string): string {
  return hourFmt.format(new Date(iso)).replace(' ', '').toLowerCase();
}

export function formatLongDate(date: Date = new Date()): string {
  return longDateFmt.format(date);
}

export function formatShortDate(iso: string): string {
  return shortDateFmt.format(new Date(iso));
}

/** "06:50" (24-hour Manila clock) -> "6:50 AM". */
export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** "2h ago", "in 3 hours", "just now". */
export function formatRelative(iso: string | number, now: number = Date.now()): string {
  const diffSec = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  return rtf.format(Math.round(diffSec / 86_400), 'day');
}

/** Short form for cards: "2h ago", "5m ago". */
export function formatAgo(iso: string, now: number = Date.now()): string {
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (min < 1) return 'now';
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function formatCount(n: number | null): string {
  return n === null ? '–' : compactFmt.format(n);
}

export function formatTemp(c: number): string {
  return `${Math.round(c)}°`;
}

/** Cebuano greeting by Manila hour. */
export function greeting(date: Date = new Date()): string {
  const hour = Number(hourOfDayFmt.format(date));
  if (hour < 12) return 'Maayong buntag';
  if (hour < 18) return 'Maayong hapon';
  return 'Maayong gabii';
}

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function formatDays(days: number[]): string {
  const sorted = [...days].sort();
  if (sorted.join() === '1,2,3,4,5') return 'Weekdays';
  if (sorted.length === 7) return 'Every day';
  if (sorted.join() === '0,6') return 'Weekends';
  return sorted.map((d) => DAY_SHORT[d]).join(', ');
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .replace(/["“”].*?["“”]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .filter((c) => /[A-Za-z]/.test(c))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function minutesLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
