// src/lib/time.ts

// ---------- formatting / math utils ----------
export function clampMin0(x: number): number {
  return Math.max(0, x);
}

export function formatMinutes(totalMin: number): string {
  const m = clampMin0(Math.round(totalMin));
  const h = Math.floor(m / 60);
  const r = m % 60;

  if (h <= 0) return `${r}m`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}

// ---------- date keys (LA time zone) ----------
function ymdInTimeZone(date: Date, timeZone: string): string {
  // en-CA -> YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getTodayKey(now = new Date()): string {
  // PST/PDT 포함 LA 기준
  return ymdInTimeZone(now, "America/Los_Angeles");
}

export function getWeekKey(now = new Date()): string {
  // LA 기준 날짜(YYYY-MM-DD)로 주차 계산
  const ymd = getTodayKey(now);
  const [y, m, d] = ymd.split("-").map(Number);
  const local = new Date(y, m - 1, d); // 날짜 계산용

  // JS: Sun=0..Sat=6, Monday-start index: Mon=0..Sun=6
  const jsDay = local.getDay();
  const mon0 = (jsDay + 6) % 7;

  // Monday of this week
  const monday = new Date(local);
  monday.setDate(local.getDate() - mon0);

  // ISO week calculation (week 1 contains Jan 4)
  const jan4 = new Date(monday.getFullYear(), 0, 4);
  const jan4Mon0 = (jan4.getDay() + 6) % 7;
  const week1Mon = new Date(jan4);
  week1Mon.setDate(jan4.getDate() - jan4Mon0);

  const diffDays = Math.round(
    (monday.getTime() - week1Mon.getTime()) / (24 * 60 * 60 * 1000)
  );
  const weekNo = 1 + Math.floor(diffDays / 7);

  const yyyy = monday.getFullYear();
  const ww = String(weekNo).padStart(2, "0");
  return `${yyyy}-W${ww}`;
}
