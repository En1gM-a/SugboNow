// Asia/Manila date and time helpers. Manila is UTC+8 all year (no daylight
// saving time), so a fixed offset is exact.

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

function inManila(date: Date): Date {
  return new Date(date.getTime() + MANILA_OFFSET_MS);
}

// "2026-10-22" for the Manila calendar day containing `date`.
export function manilaDate(date: Date): string {
  return inManila(date).toISOString().slice(0, 10);
}

// 0 = Sunday … 6 = Saturday, matching schedule_entries.days_of_week.
export function manilaWeekday(date: Date): number {
  return inManila(date).getUTCDay();
}

// The instant for a Manila wall-clock time on a Manila date ("07:30").
export function manilaDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time.slice(0, 5)}:00+08:00`);
}

// "07:30" (24-hour) in Manila time.
export function manilaClock(date: Date): string {
  return inManila(date).toISOString().slice(11, 16);
}

// "7:30 AM" in Manila time.
export function formatClock12(date: Date): string {
  const [hours, minutes] = manilaClock(date).split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

// "Thursday, October 22" in Manila time.
export function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addHours(date: Date, hours: number): Date {
  return addMinutes(date, hours * 60);
}
