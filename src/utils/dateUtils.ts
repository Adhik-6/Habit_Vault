// ─────────────────────────────────────────────
// DATE UTILITIES
// All dates stored/compared as YYYY-MM-DD strings.
// ─────────────────────────────────────────────

export function toDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateString(dateStr: string): Date {
  // Parse without timezone shift
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayString(): string {
  return toDateString(new Date());
}

export function isToday(dateStr: string): boolean {
  return dateStr === todayString();
}

export function isSameDay(d1: string, d2: string): boolean {
  return d1 === d2;
}

export function isPast(dateStr: string): boolean {
  return dateStr < todayString();
}

export function isFuture(dateStr: string): boolean {
  return dateStr > todayString();
}

/** Returns ordered YYYY-MM-DD strings for the week containing `date` (Sun–Sat). */
export function getWeekDates(date: Date = new Date()): string[] {
  const dates: string[] = [];
  const dayOfWeek = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - dayOfWeek);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(toDateString(d));
  }
  return dates;
}

/** Returns ordered YYYY-MM-DD strings for every day in a given month. */
export function getMonthDates(year: number, month: number): string[] {
  const dates: string[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(toDateString(new Date(year, month, d)));
  }
  return dates;
}

/** Returns the last N days ending today (inclusive), oldest first. */
export function getLastNDays(n: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(toDateString(d));
  }
  return dates;
}

export function getLast7Days(): string[] {
  return getLastNDays(7);
}

export function getLast30Days(): string[] {
  return getLastNDays(30);
}

export function getLast365Days(): string[] {
  return getLastNDays(365);
}

export function addDays(dateStr: string, days: number): string {
  const d = fromDateString(dateStr);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

/** Positive if d2 is after d1. */
export function diffDays(d1: string, d2: string): number {
  return Math.round(
    (fromDateString(d2).getTime() - fromDateString(d1).getTime()) /
      (1000 * 60 * 60 * 24),
  );
}

export function getDayOfWeek(dateStr: string): number {
  return fromDateString(dateStr).getDay();
}

export function getDayName(dayIndex: number): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIndex];
}

export function getShortDayName(dayIndex: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex];
}

export function getMonthName(monthIndex: number): string {
  return [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ][monthIndex];
}

export function getShortMonthName(monthIndex: number): string {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex];
}

export function formatDisplayDate(dateStr: string): string {
  const d = fromDateString(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

export function getRelativeLabel(dateStr: string): string {
  const today = todayString();
  const yesterday = addDays(today, -1);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return formatDisplayDate(dateStr);
}
