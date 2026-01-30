function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// Local time 기준
export function getTodayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

// ISO week 계산 (local time -> date components 기반)
// weekKey = YYYY-WW
export function getWeekKey(d = new Date()): string {
  // Convert to "UTC midnight" style date to avoid DST edge cases.
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

  // ISO: week starts on Monday, week 1 has Jan 4
  const dayNum = date.getUTCDay() || 7; // 1..7 (Mon..Sun), with Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum); // move to Thursday of current week

  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  const year = date.getUTCFullYear();
  const ww = String(weekNo).padStart(2, "0");
  return `${year}-W${ww}`;
}

export function clampMin0(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.floor(x));
}

export function formatMinutes(min: number): string {
  const m = clampMin0(min);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h <= 0) return `${r}m`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}
