// src/lib/time.ts
function ymdInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getTodayKey(now = new Date()): string {
  return ymdInTimeZone(now, "America/Los_Angeles");
}

export function getWeekKey(now = new Date()): string {
  const ymd = getTodayKey(now);
  const [y, m, d] = ymd.split("-").map(Number);
  const local = new Date(y, m - 1, d);

  const jsDay = local.getDay(); // Sun=0..Sat=6
  const mon0 = (jsDay + 6) % 7;

  const monday = new Date(local);
  monday.setDate(local.getDate() - mon0);

  const jan4 = new Date(monday.getFullYear(), 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const week1Mon = new Date(jan4);
  week1Mon.setDate(jan4.getDate() - jan4Day);

  const diffDays = Math.round(
    (monday.getTime() - week1Mon.getTime()) / (24 * 60 * 60 * 1000)
  );
  const weekNo = 1 + Math.floor(diffDays / 7);

  const yyyy = monday.getFullYear();
  const ww = String(weekNo).padStart(2, "0");
  return `${yyyy}-W${ww}`;
}
