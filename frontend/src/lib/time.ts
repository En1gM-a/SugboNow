// The Manila clock. The sky, the greeting and the first-paint script in index.html share these four time names.

export type TimeName = 'buntag' | 'udto' | 'hapon' | 'gabii';

const clockParts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' });

export function manilaMinutes(date: Date = new Date()): number {
  const parts = clockParts.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get('hour') * 60 + get('minute');
}

/** buntag 05:00–09:59, udto 10:00–15:59, hapon 16:00–18:29, gabii 18:30–04:59. */
export function timeName(date: Date = new Date()): TimeName {
  const m = manilaMinutes(date);
  if (m >= 300 && m < 600) return 'buntag';
  if (m >= 600 && m < 960) return 'udto';
  if (m >= 960 && m < 1110) return 'hapon';
  return 'gabii';
}

const GREETING: Record<TimeName, string> = {
  buntag: 'Maayong buntag',
  udto: 'Maayong udto',
  hapon: 'Maayong hapon',
  gabii: 'Maayong gabii',
};

export function greeting(time: TimeName, firstName: string | null | undefined): string {
  return firstName ? `${GREETING[time]}, ${firstName}` : GREETING[time];
}

const headerDate = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric' });

/** "Mon, Nov 2". */
export function shortDate(date: Date = new Date()): string {
  return headerDate.format(date);
}
