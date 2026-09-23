// Small Firestore helpers shared by every collection module.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v.toDate === "function") return v.toDate();
  if (typeof v === "number" || typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function toDateOr(v: unknown, fallback: Date): Date {
  return toDate(v) ?? fallback;
}

/** Firestore rejects `undefined`; strip it before a set/update. */
export function pruneUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as T;
}

export function str(v: unknown, max = 5000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

export function bool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

export function strArray(v: unknown, max = 50): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, max) : [];
}

/** Parse a date coming from JSON (ISO string / ms / null). */
export function dateInput(v: unknown): Date | null {
  if (v === null || v === undefined || v === "") return null;
  return toDate(v);
}

export function newId(): string {
  // Firestore-style 20-char ids without needing a doc ref.
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 20; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}
