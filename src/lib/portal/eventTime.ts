import type { PortalEvent } from "@/lib/models/Portal";
import { parseTimeLabel, centralParts, centralDate } from "@/lib/utils/time";

// All event times are US Central. An event is "upcoming" until 24 hours after
// it ENDS, then it moves to the Archive — which is also the first moment an
// unmarked member shows as "Missed", so exec has a day to mark attendance.
export const ARCHIVE_AFTER_MS = 24 * 60 * 60 * 1000;
// Used when an event has a start time but no end time.
const DEFAULT_LENGTH_MS = 2 * 60 * 60 * 1000;

type Timed = Pick<PortalEvent, "startsAt" | "timeLabel" | "endTimeLabel">;

/** When the event ends, in real time. All-day → 11:59 PM Central that day. */
export function eventEndsAt(e: Timed): Date {
  const p = centralParts(e.startsAt);
  if (!parseTimeLabel(e.timeLabel)) return centralDate(p.y, p.m, p.d, 23, 59);
  const end = e.endTimeLabel ? parseTimeLabel(e.endTimeLabel) : null;
  if (!end) return new Date(e.startsAt.getTime() + DEFAULT_LENGTH_MS);
  const at = centralDate(p.y, p.m, p.d, end.h, end.m);
  // "10:00 PM – 1:00 AM" crosses midnight.
  return at.getTime() <= e.startsAt.getTime() ? new Date(at.getTime() + 24 * 60 * 60 * 1000) : at;
}

export function eventEnded(e: Timed, now = Date.now()): boolean {
  return eventEndsAt(e).getTime() < now;
}

export function eventArchived(e: Timed, now = Date.now()): boolean {
  return eventEndsAt(e).getTime() + ARCHIVE_AFTER_MS < now;
}

/** "6:00 PM – 6:30 PM", or just the start label when there's no end time. */
export function eventTimeRange(e: Pick<PortalEvent, "timeLabel" | "endTimeLabel">): string {
  return e.endTimeLabel && parseTimeLabel(e.timeLabel) ? `${e.timeLabel} – ${e.endTimeLabel}` : e.timeLabel;
}
