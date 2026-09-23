import { Team } from "./Member";

// ---------- Opportunities (exec-posted, member-applied) ----------

/** A screening question the exec attaches to a posting; members answer on apply. */
export interface PostingQuestion {
  id: string;
  label: string;
  type: "short" | "long";
  required: boolean;
}
export const MAX_QUESTIONS = 10;

/** A member's answer, with the label snapshotted so it survives later edits. */
export interface ApplicationAnswer {
  id: string;
  label: string;
  value: string;
}

export type OpportunityStatus = "live" | "draft" | "scheduled" | "closed";
export const OPPORTUNITY_STATUSES: OpportunityStatus[] = ["live", "draft", "scheduled", "closed"];
export const OPPORTUNITY_STATUS_LABEL: Record<OpportunityStatus, string> = {
  live: "Live",
  draft: "Draft — waiting to post",
  scheduled: "Scheduled",
  closed: "Closed",
};

export interface Opportunity {
  id: string;
  title: string;
  employerId: string;
  employerName: string; // denormalised for lists
  teams: Team[]; // the field teams this work belongs to
  audienceTeams: Team[]; // who can see it; empty = all members
  commitment: string; // "10 hrs/wk · Fall 2026"
  closesAt: Date | null; // null = rolling
  status: OpportunityStatus;
  publishAt: Date | null; // for scheduled
  previewImageUrl: string;
  summary: string;
  description: string; // plain text, blank-line separated paragraphs
  requiresTeamResume: boolean;
  pinned: boolean; // held at the top of the members' Opportunities grid
  questions: PostingQuestion[];
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  updatedByName: string;
  publishedAt: Date | null;
}

/** Live now = explicitly live, or scheduled and the publish time has passed. */
export function isOpportunityLive(o: Opportunity, now = Date.now()): boolean {
  if (o.status === "live") return true;
  if (o.status === "scheduled" && o.publishAt && o.publishAt.getTime() <= now) return true;
  return false;
}

const SOON_MS = 7 * 24 * 60 * 60 * 1000;
export function closesSoon(o: Opportunity, now = Date.now()): boolean {
  return !!o.closesAt && o.closesAt.getTime() - now <= SOON_MS && o.closesAt.getTime() >= now;
}
export function isPastDeadline(o: Opportunity, now = Date.now()): boolean {
  return !!o.closesAt && o.closesAt.getTime() < now;
}

// ---------- Applications (a member applying to an opportunity) ----------

export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "interview"
  | "offer"
  | "placed" // offer accepted → a current project
  | "declined"
  | "complete"; // project finished

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "submitted", "under_review", "interview", "offer", "placed", "declined", "complete",
];
export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  interview: "Interview",
  offer: "Offer",
  placed: "Offer accepted",
  declined: "Declined",
  complete: "Complete",
};
export const IN_PROGRESS_STATUSES: ApplicationStatus[] = ["submitted", "under_review", "interview", "offer"];
export const DECIDED_STATUSES: ApplicationStatus[] = ["placed", "declined", "complete"];

export interface MemberApplication {
  id: string;
  userId: string;
  userName: string;
  opportunityId: string;
  opportunityTitle: string;
  employerName: string;
  team: Team | null;
  resumeId: string;
  resumeFileName: string;
  status: ApplicationStatus;
  submittedAt: Date;
  updatedAt: Date;
  decidedAt: Date | null;
  nextStep: string; // free text shown to the member ("Interview Sep 12, 3:00 PM · Zoom")
  nextStepAt: Date | null; // for the calendar link
  joinLink: string;
  answers: ApplicationAnswer[];
}

// ---------- Events ----------

// "company": an employer is in the room — showing up matters. Red badge.
export type EventType = "workshop" | "profdev" | "social" | "info" | "company";
export const EVENT_TYPES: EventType[] = ["workshop", "profdev", "social", "info", "company"];
export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  workshop: "Workshop",
  profdev: "Prof dev",
  social: "Social",
  info: "Info session",
  company: "Company",
};
export type EventStatus = "published" | "draft";

export interface PortalEvent {
  id: string;
  title: string;
  startsAt: Date;
  timeLabel: string; // "6:00 PM" / "All day"
  location: string;
  capacity: number | null;
  type: EventType;
  audienceTeams: Team[];
  description: string;
  countsForAttendance: boolean;
  pinned: boolean; // held at the top of Upcoming
  rsvpUrl: string; // optional external RSVP (Google Form etc.); replaces the in-app RSVP
  status: EventStatus;
  rsvpUids: string[];
  attendedUids: string[];
  excusedUids: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ---------- Announcements ----------

export type AnnouncementLabel = "pinned" | "action" | "update";
export const ANNOUNCEMENT_LABELS: AnnouncementLabel[] = ["pinned", "action", "update"];
export const ANNOUNCEMENT_LABEL_TEXT: Record<AnnouncementLabel, string> = {
  pinned: "Pinned",
  action: "Action needed",
  update: "Update",
};
export type AnnouncementStatus = "live" | "draft" | "scheduled";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  label: AnnouncementLabel;
  audienceTeams: Team[];
  status: AnnouncementStatus;
  publishAt: Date | null;
  expiresAt: Date | null;
  authorUid: string;
  authorName: string;
  emailMembers: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function isAnnouncementLive(a: Announcement, now = Date.now()): boolean {
  if (a.expiresAt && a.expiresAt.getTime() < now) return false;
  if (a.status === "live") return true;
  if (a.status === "scheduled" && a.publishAt && a.publishAt.getTime() <= now) return true;
  return false;
}

// ---------- Employers ----------

export type EmployerStatus = "active" | "inactive";

export interface Employer {
  id: string;
  name: string;
  contact: string;
  email: string;
  location: string;
  website: string;
  teams: Team[];
  logoUrl: string;
  status: EmployerStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ---------- Portal config ----------

export interface PortalConfig {
  season: string; // "Fall 2026"
  week: number; // shown on the home hero
  requiredEvents: number; // attendance requirement per semester
  calendarUrl: string; // optional external calendar link (else the ICS feed)
}
export const DEFAULT_CONFIG: PortalConfig = { season: "Fall 2026", week: 3, requiredEvents: 4, calendarUrl: "" };
