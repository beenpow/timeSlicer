function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function ymdInTimeZone(date: Date, timeZone: string): string {
  // en-CA는 YYYY-MM-DD 형태로 나옴
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getTodayKey(now = new Date()): string {
  // PST/PDT 포함한 LA 시간 기준
  return ymdInTimeZone(now, "America/Los_Angeles");
}

// Week key도 PST 기준으로 맞추는 게 좋음
export function getWeekKey(now = new Date()): string {
  // LA 기준 날짜로 "그 주의 월요일"을 계산
  // 1) now를 LA 기준 ymd로 떼고
  const ymd = getTodayKey(now); // "YYYY-MM-DD"
  const [y, m, d] = ymd.split("-").map(Number);
  const local = new Date(y, m - 1, d); // 이 Date는 로컬 타임존이지만 '날짜'만 쓰는 용도

  // JS: Sun=0..Sat=6, 월요일 시작으로 변환: Mon=0..Sun=6
  const jsDay = local.getDay();
  const mon0 = (jsDay + 6) % 7;

  // 월요일로 이동
  const monday = new Date(local);
  monday.setDate(local.getDate() - mon0);

  // ISO week number 계산(간단 버전)
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
