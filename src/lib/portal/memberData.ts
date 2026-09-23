import { Member, visibleTo } from "@/lib/models/Member";
import {
  Opportunity, isOpportunityLive, isPastDeadline,
  PortalEvent, Announcement, isAnnouncementLive, MemberApplication,
} from "@/lib/models/Portal";
import { getAllOpportunities, getAllEvents, getAllAnnouncements, getApplicationsForMember, getPortalConfig } from "@/lib/firebase/portal";

// Everything a member can see, resolved server-side. The collections are small
// (tens of docs) so reading them whole and filtering in memory is simplest and
// keeps visibility logic in one place.

export async function visibleOpportunities(member: Member): Promise<Opportunity[]> {
  const all = await getAllOpportunities();
  return all.filter((o) => isOpportunityLive(o) && !isPastDeadline(o) && visibleTo(o.audienceTeams, member.teams));
}

export async function visibleEvents(member: Member): Promise<PortalEvent[]> {
  const all = await getAllEvents();
  return all.filter((e) => e.status === "published" && visibleTo(e.audienceTeams, member.teams));
}

export async function visibleAnnouncements(member: Member): Promise<Announcement[]> {
  const all = await getAllAnnouncements();
  const order = { pinned: 0, action: 1, update: 2 };
  return all
    .filter((a) => isAnnouncementLive(a) && visibleTo(a.audienceTeams, member.teams))
    .sort((a, b) => order[a.label] - order[b.label] || (b.publishAt ?? b.createdAt).getTime() - (a.publishAt ?? a.createdAt).getTime());
}

export async function memberApplications(member: Member): Promise<MemberApplication[]> {
  return getApplicationsForMember(member.uid);
}

// An event stays "upcoming" until 2h after it starts (so the RSVP row doesn't
// vanish mid-event), then moves to Past.
const UPCOMING_GRACE_MS = 2 * 60 * 60 * 1000;

export function splitEvents(events: PortalEvent[], now = Date.now()) {
  const upcoming = events.filter((e) => e.startsAt.getTime() + UPCOMING_GRACE_MS >= now).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = events.filter((e) => e.startsAt.getTime() + UPCOMING_GRACE_MS < now).sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  return { upcoming, past };
}

export type AttendanceState = "attended" | "excused" | "missed" | "upcoming";

export function attendanceState(e: PortalEvent, uid: string, now = Date.now()): AttendanceState {
  if (e.attendedUids.includes(uid)) return "attended";
  if (e.excusedUids.includes(uid)) return "excused";
  return e.startsAt.getTime() + UPCOMING_GRACE_MS < now ? "missed" : "upcoming";
}

/** How many required-type events the member has attended this season. */
export function attendedCount(events: PortalEvent[], uid: string): number {
  return events.filter((e) => e.countsForAttendance && e.attendedUids.includes(uid)).length;
}

export async function portalConfig() {
  return getPortalConfig();
}
