// The real ingestion schedules (backend/src/jobs/scheduler.ts), so the landing page's "next check in" clocks are true.
// Each is a list of seconds past midnight, Manila time.

function slots(everyMin: number, offsetMin: number, fromHour: number, toHour: number): number[] {
  const out: number[] = [];
  for (let m = fromHour * 60 + offsetMin; m < (toHour + 1) * 60; m += everyMin) out.push(m * 60);
  return out;
}

const SCHEDULES = {
  traffic: slots(15, 0, 5, 22),
  weather: slots(60, 5, 0, 23),
  sunstar: slots(30, 0, 0, 23),
  cdn: slots(30, 15, 0, 23),
  gnews: slots(180, 20, 0, 23),
};

export type ScheduleName = keyof typeof SCHEDULES;

export function secondsLeft(name: ScheduleName, now: number): number {
  const list = SCHEDULES[name];
  for (const s of list) if (s > now) return s - now;
  return list[0] + 86400 - now;
}

export function clockText(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}

const seconds = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' });

export function manilaSeconds(): number {
  const parts = seconds.formatToParts(new Date());
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get('hour') * 3600 + get('minute') * 60 + get('second');
}
