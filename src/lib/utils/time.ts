// Event times are entered as a calendar date plus a display label ("7:00 PM",
// "All day"). This turns them into a real instant in US Central.

/** "7:00 PM" / "7pm" / "18:30" → {h, m}; null when it isn't a clock time. */
export function parseTimeLabel(label: string): { h: number; m: number } | null {
  const s = label.trim().toLowerCase();
  const m12 = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)$/);
  if (m12) {
    let h = Number(m12[1]) % 12;
    if (m12[3].startsWith("p")) h += 12;
    return { h, m: Number(m12[2] ?? 0) };
  }
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return { h: Number(m24[1]), m: Number(m24[2]) };
  return null;
}

/** Central offset for a calendar date: CDT (-05:00) roughly Mar–Nov, else CST. */
function centralOffset(year: number, month: number, day: number): string {
  // DST: second Sunday of March 2:00 → first Sunday of November 2:00.
  const secondSundayMarch = 14 - new Date(Date.UTC(year, 2, 1)).getUTCDay();
  const firstSundayNov = 7 - new Date(Date.UTC(year, 10, 1)).getUTCDay();
  const afterStart = month > 3 || (month === 3 && day >= secondSundayMarch);
  const beforeEnd = month < 11 || (month === 11 && day < firstSundayNov);
  return afterStart && beforeEnd ? "-05:00" : "-06:00";
}

/** A Central-time instant from calendar parts. */
export function centralDate(y: number, m: number, d: number, h = 12, min = 0): Date {
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}:00${centralOffset(y, m, d)}`;
  return new Date(iso);
}

/** Calendar parts of an instant, in Central. */
export function centralParts(date: Date): { y: number; m: number; d: number; h: number; min: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour") % 24, min: get("minute") };
}

/** Build the event instant from "YYYY-MM-DD" + a time label. All-day → 9:00 AM. */
export function buildStartsAt(dateStr: string, timeLabel: string): Date | null {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = parseTimeLabel(timeLabel) ?? { h: 9, m: 0 };
  const iso = `${m[1]}-${m[2]}-${m[3]}T${String(t.h).padStart(2, "0")}:${String(t.m).padStart(2, "0")}:00${centralOffset(y, mo, d)}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}
