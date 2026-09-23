// Date / number formatting used across the portal. Everything is US Central.

const TZ = "America/Chicago";

export function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: TZ });
}

export function fmtDateYear(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: TZ });
}

export function fmtMonthYear(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: TZ });
}

export function fmtTime(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: TZ });
}

export function fmtWeekdayDateTime(d: Date | null | undefined): string {
  if (!d) return "";
  return `${d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: TZ })} at ${fmtTime(d)}`;
}

/** "SEP" / "11" for the date blocks. */
export function monthShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", timeZone: TZ }).toUpperCase();
}
export function dayNum(d: Date): string {
  return d.toLocaleDateString("en-US", { day: "2-digit", timeZone: TZ });
}

export function fmtBytes(n: number): string {
  if (!n) return "0 KB";
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function relativeTime(d: Date | null | undefined, now = Date.now()): string {
  if (!d) return "";
  const s = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return fmtDate(d);
}

/** For <input type="date"> values (local calendar date). */
export function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** For <input type="datetime-local"> values. */
export function toDateTimeInput(d: Date | null | undefined): string {
  if (!d) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Google Calendar "add event" link. */
export function gcalLink(title: string, start: Date, minutes = 30, details = "", location = ""): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(start.getTime() + minutes * 60 * 1000);
  const p = new URLSearchParams({ action: "TEMPLATE", text: title, dates: `${fmt(start)}/${fmt(end)}`, details, location });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
}
