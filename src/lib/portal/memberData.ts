import { Member, visibleTo } from "@/lib/models/Member";
import {
  Opportunity, isOpportunityLive, isPastDeadline,
  PortalEvent, Announcement, isAnnouncementLive, MemberApplication,
} from "@/lib/models/Portal";
import { getAllOpportunities, getAllEvents, getAllAnnouncements, getApplicationsForMember, getPortalConfig, getAllEmployers } from "@/lib/firebase/portal";
import { eventArchived } from "@/lib/portal/eventTime";
import { myCheckinEventIds } from "@/lib/firebase/checkins";

// Everything a member can see, resolved server-side. The collections are small
// (tens of docs) so reading them whole and filtering in memory is simplest and
// keeps visibility logic in one place.

export async function visibleOpportunities(member: Member): Promise<Opportunity[]> {
  const [all, employers] = await Promise.all([getAllOpportunities(), getAllEmployers()]);
  const logo = new Map(employers.map((e) => [e.id, e.logoUrl]));
  return all
    .filter((o) => isOpportunityLive(o) && !isPastDeadline(o) && visibleTo(o.audienceTeams, member.teams))
    // No image on the posting → the employer's saved default image.
    .map((o) => (o.previewImageUrl ? o : { ...o, previewImageUrl: logo.get(o.employerId) ?? "" }));
}

export async function visibleEvents(member: Member): Promise<PortalEvent[]> {
  const [all, mine] = await Promise.all([getAllEvents(), myCheckinEventIds(member.uid)]);
  return all
    .filter((e) => e.status === "published" && visibleTo(e.audienceTeams, member.teams))
    // A QR check-in may not be merged onto the event yet; count it for this member now.
    .map((e) => (mine.has(e.id) && !e.attendedUids.includes(member.uid) ? { ...e, attendedUids: [...e.attendedUids, member.uid] } : e));
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

// An event stays "upcoming" until 24h after it ends (Central), then moves to
// the Archive. See lib/portal/eventTime.ts.
export function splitEvents(events: PortalEvent[], now = Date.now()) {
  const upcoming = events.filter((e) => !eventArchived(e, now)).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = events.filter((e) => eventArchived(e, now)).sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  return { upcoming, past };
}

export type AttendanceState = "attended" | "excused" | "missed" | "upcoming";

export function attendanceState(e: PortalEvent, uid: string, now = Date.now()): AttendanceState {
  if (e.attendedUids.includes(uid)) return "attended";
  if (e.excusedUids.includes(uid)) return "excused";
  // "Missed" only once the event is archived, so nobody shows missed while exec is still marking.
  return eventArchived(e, now) ? "missed" : "upcoming";
}

/** How many required-type events the member has attended this season. */
export function attendedCount(events: PortalEvent[], uid: string): number {
  return events.filter((e) => e.countsForAttendance && e.attendedUids.includes(uid)).length;
}

export async function portalConfig() {
  return getPortalConfig();
}
