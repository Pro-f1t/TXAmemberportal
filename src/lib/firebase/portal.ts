import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { toDate, toDateOr, pruneUndefined, newId } from "./fs";
import { isTeam } from "@/lib/models/Member";
import {
  Opportunity, OpportunityStatus, OPPORTUNITY_STATUSES,
  MemberApplication, ApplicationStatus, APPLICATION_STATUSES,
  PortalEvent, EventType, EVENT_TYPES,
  Announcement, AnnouncementLabel, ANNOUNCEMENT_LABELS,
  Employer, PortalConfig, DEFAULT_CONFIG, PostingQuestion, ApplicationAnswer,
} from "@/lib/models/Portal";

const OPPS = "opportunities";
const APPS = "applications";
const EVENTS = "events";
const ANNS = "announcements";
const EMPLOYERS = "employers";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------- Opportunities ----------

export function toOpportunity(id: string, d: any): Opportunity {
  return {
    id,
    title: d.title ?? "Untitled posting",
    employerId: d.employerId ?? "",
    employerName: d.employerName ?? "",
    teams: (Array.isArray(d.teams) ? d.teams : []).filter(isTeam),
    audienceTeams: (Array.isArray(d.audienceTeams) ? d.audienceTeams : []).filter(isTeam),
    commitment: d.commitment ?? "",
    closesAt: toDate(d.closesAt),
    status: OPPORTUNITY_STATUSES.includes(d.status) ? (d.status as OpportunityStatus) : "draft",
    publishAt: toDate(d.publishAt),
    previewImageUrl: d.previewImageUrl ?? "",
    summary: d.summary ?? "",
    description: d.description ?? "",
    requiresTeamResume: !!d.requiresTeamResume,
    pinned: !!d.pinned,
    questions: (Array.isArray(d.questions) ? d.questions : [])
      .filter((q: any) => q && typeof q.id === "string" && typeof q.label === "string")
      .map((q: any): PostingQuestion => ({ id: q.id, label: q.label, type: q.type === "long" ? "long" : "short", required: !!q.required })),
    createdBy: d.createdBy ?? "",
    createdByName: d.createdByName ?? "",
    createdAt: toDateOr(d.createdAt, new Date()),
    updatedAt: toDateOr(d.updatedAt, new Date()),
    updatedByName: d.updatedByName ?? "",
    publishedAt: toDate(d.publishedAt),
  };
}

export async function getOpportunity(id: string): Promise<Opportunity | null> {
  const doc = await adminDb.collection(OPPS).doc(id).get();
  return doc.exists ? toOpportunity(doc.id, doc.data()) : null;
}

export async function getAllOpportunities(): Promise<Opportunity[]> {
  const snap = await adminDb.collection(OPPS).get();
  return snap.docs.map((d) => toOpportunity(d.id, d.data())).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export type OpportunityInput = Omit<Opportunity, "id" | "createdAt" | "updatedAt" | "createdBy" | "createdByName" | "updatedByName" | "publishedAt">;

export async function upsertOpportunity(
  id: string | null,
  input: Partial<OpportunityInput>,
  actor: { uid: string; name: string }
): Promise<string> {
  const docId = id ?? newId();
  const ref = adminDb.collection(OPPS).doc(docId);
  const existing = await ref.get();
  const now = new Date();
  const prev = existing.exists ? toOpportunity(docId, existing.data()) : null;
  const becomingLive = input.status === "live" && prev?.status !== "live";
  await ref.set(
    pruneUndefined({
      ...input,
      updatedAt: now,
      updatedByName: actor.name,
      ...(prev ? {} : { createdAt: now, createdBy: actor.uid, createdByName: actor.name }),
      ...(becomingLive ? { publishedAt: now } : {}),
    }),
    { merge: true }
  );
  return docId;
}

// ---------- Applications ----------

export function toApplication(id: string, d: any): MemberApplication {
  return {
    id,
    userId: d.userId ?? "",
    userName: d.userName ?? "",
    opportunityId: d.opportunityId ?? "",
    opportunityTitle: d.opportunityTitle ?? "",
    employerName: d.employerName ?? "",
    team: isTeam(d.team) ? d.team : null,
    resumeId: d.resumeId ?? "",
    resumeFileName: d.resumeFileName ?? "",
    status: APPLICATION_STATUSES.includes(d.status) ? (d.status as ApplicationStatus) : "submitted",
    submittedAt: toDateOr(d.submittedAt, new Date()),
    updatedAt: toDateOr(d.updatedAt, new Date()),
    decidedAt: toDate(d.decidedAt),
    nextStep: d.nextStep ?? "",
    nextStepAt: toDate(d.nextStepAt),
    joinLink: d.joinLink ?? "",
    answers: (Array.isArray(d.answers) ? d.answers : [])
      .filter((a: any) => a && typeof a.id === "string")
      .map((a: any): ApplicationAnswer => ({ id: a.id, label: String(a.label ?? ""), value: String(a.value ?? "") })),
  };
}

export async function getApplication(id: string): Promise<MemberApplication | null> {
  const doc = await adminDb.collection(APPS).doc(id).get();
  return doc.exists ? toApplication(doc.id, doc.data()) : null;
}

export async function getApplicationsForMember(uid: string): Promise<MemberApplication[]> {
  const snap = await adminDb.collection(APPS).where("userId", "==", uid).get();
  return snap.docs.map((d) => toApplication(d.id, d.data())).sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

export async function getApplicationsForOpportunity(opportunityId: string): Promise<MemberApplication[]> {
  const snap = await adminDb.collection(APPS).where("opportunityId", "==", opportunityId).get();
  return snap.docs.map((d) => toApplication(d.id, d.data())).sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

export async function getAllApplications(): Promise<MemberApplication[]> {
  const snap = await adminDb.collection(APPS).get();
  return snap.docs.map((d) => toApplication(d.id, d.data())).sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
}

/** One application per (member, opportunity): the doc id is deterministic. */
export function applicationId(uid: string, opportunityId: string): string {
  return `${uid}__${opportunityId}`;
}

export async function createApplication(app: Omit<MemberApplication, "id" | "updatedAt" | "decidedAt" | "nextStep" | "nextStepAt" | "joinLink">): Promise<string> {
  const id = applicationId(app.userId, app.opportunityId);
  await adminDb.collection(APPS).doc(id).set(
    { ...app, updatedAt: new Date(), decidedAt: null, nextStep: "", nextStepAt: null, joinLink: "" },
    { merge: false }
  );
  return id;
}

export async function updateApplication(
  id: string,
  patch: Partial<Pick<MemberApplication, "status" | "nextStep" | "nextStepAt" | "joinLink">>
): Promise<void> {
  const decided = patch.status && ["placed", "declined", "complete"].includes(patch.status);
  await adminDb.collection(APPS).doc(id).set(
    pruneUndefined({ ...patch, updatedAt: new Date(), ...(decided ? { decidedAt: new Date() } : {}) }),
    { merge: true }
  );
}

// ---------- Events ----------

export function toEvent(id: string, d: any): PortalEvent {
  return {
    id,
    title: d.title ?? "Untitled event",
    startsAt: toDateOr(d.startsAt, new Date()),
    timeLabel: d.timeLabel ?? "",
    location: d.location ?? "",
    capacity: typeof d.capacity === "number" ? d.capacity : null,
    type: EVENT_TYPES.includes(d.type) ? (d.type as EventType) : "workshop",
    audienceTeams: (Array.isArray(d.audienceTeams) ? d.audienceTeams : []).filter(isTeam),
    description: d.description ?? "",
    countsForAttendance: d.countsForAttendance !== false,
    pinned: !!d.pinned,
    rsvpUrl: d.rsvpUrl ?? "",
    status: d.status === "draft" ? "draft" : "published",
    rsvpUids: Array.isArray(d.rsvpUids) ? d.rsvpUids : [],
    attendedUids: Array.isArray(d.attendedUids) ? d.attendedUids : [],
    excusedUids: Array.isArray(d.excusedUids) ? d.excusedUids : [],
    createdAt: toDateOr(d.createdAt, new Date()),
    updatedAt: toDateOr(d.updatedAt, new Date()),
  };
}

export async function getEvent(id: string): Promise<PortalEvent | null> {
  const doc = await adminDb.collection(EVENTS).doc(id).get();
  return doc.exists ? toEvent(doc.id, doc.data()) : null;
}

export async function getAllEvents(): Promise<PortalEvent[]> {
  const snap = await adminDb.collection(EVENTS).get();
  return snap.docs.map((d) => toEvent(d.id, d.data())).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export type EventInput = Omit<PortalEvent, "id" | "createdAt" | "updatedAt" | "rsvpUids" | "attendedUids" | "excusedUids">;

export async function upsertEvent(id: string | null, input: Partial<EventInput>): Promise<string> {
  const docId = id ?? newId();
  const ref = adminDb.collection(EVENTS).doc(docId);
  const exists = (await ref.get()).exists;
  const now = new Date();
  await ref.set(
    pruneUndefined({ ...input, updatedAt: now, ...(exists ? {} : { createdAt: now, rsvpUids: [], attendedUids: [], excusedUids: [] }) }),
    { merge: true }
  );
  return docId;
}

export async function setRsvp(eventId: string, uid: string, going: boolean): Promise<void> {
  await adminDb.collection(EVENTS).doc(eventId).set(
    { rsvpUids: going ? FieldValue.arrayUnion(uid) : FieldValue.arrayRemove(uid) },
    { merge: true }
  );
}

export type AttendanceAction = "attended" | "unattended" | "excused" | "unexcused";

export async function setAttendance(eventId: string, uid: string, action: AttendanceAction): Promise<void> {
  const ref = adminDb.collection(EVENTS).doc(eventId);
  const patch: Record<string, unknown> =
    action === "attended" ? { attendedUids: FieldValue.arrayUnion(uid), excusedUids: FieldValue.arrayRemove(uid) }
    : action === "unattended" ? { attendedUids: FieldValue.arrayRemove(uid) }
    : action === "excused" ? { excusedUids: FieldValue.arrayUnion(uid), attendedUids: FieldValue.arrayRemove(uid) }
    : { excusedUids: FieldValue.arrayRemove(uid) };
  await ref.set(patch, { merge: true });
}

// ---------- Announcements ----------

export function toAnnouncement(id: string, d: any): Announcement {
  return {
    id,
    title: d.title ?? "",
    body: d.body ?? "",
    label: ANNOUNCEMENT_LABELS.includes(d.label) ? (d.label as AnnouncementLabel) : "update",
    audienceTeams: (Array.isArray(d.audienceTeams) ? d.audienceTeams : []).filter(isTeam),
    status: d.status === "draft" ? "draft" : d.status === "scheduled" ? "scheduled" : "live",
    publishAt: toDate(d.publishAt),
    expiresAt: toDate(d.expiresAt),
    authorUid: d.authorUid ?? "",
    authorName: d.authorName ?? "",
    emailMembers: !!d.emailMembers,
    createdAt: toDateOr(d.createdAt, new Date()),
    updatedAt: toDateOr(d.updatedAt, new Date()),
  };
}

export async function getAllAnnouncements(): Promise<Announcement[]> {
  const snap = await adminDb.collection(ANNS).get();
  return snap.docs
    .map((d) => toAnnouncement(d.id, d.data()))
    .sort((a, b) => (b.publishAt ?? b.createdAt).getTime() - (a.publishAt ?? a.createdAt).getTime());
}

export type AnnouncementInput = Omit<Announcement, "id" | "createdAt" | "updatedAt" | "authorUid" | "authorName">;

export async function upsertAnnouncement(id: string | null, input: Partial<AnnouncementInput>, actor: { uid: string; name: string }): Promise<string> {
  const docId = id ?? newId();
  const ref = adminDb.collection(ANNS).doc(docId);
  const exists = (await ref.get()).exists;
  const now = new Date();
  await ref.set(
    pruneUndefined({ ...input, updatedAt: now, ...(exists ? {} : { createdAt: now, authorUid: actor.uid, authorName: actor.name }) }),
    { merge: true }
  );
  return docId;
}

// ---------- Employers ----------

export function toEmployer(id: string, d: any): Employer {
  return {
    id,
    name: d.name ?? "",
    contact: d.contact ?? "",
    email: d.email ?? "",
    location: d.location ?? "",
    website: d.website ?? "",
    teams: (Array.isArray(d.teams) ? d.teams : []).filter(isTeam),
    logoUrl: d.logoUrl ?? "",
    status: d.status === "inactive" ? "inactive" : "active",
    createdAt: toDateOr(d.createdAt, new Date()),
    updatedAt: toDateOr(d.updatedAt, new Date()),
  };
}

export async function getEmployer(id: string): Promise<Employer | null> {
  const doc = await adminDb.collection(EMPLOYERS).doc(id).get();
  return doc.exists ? toEmployer(doc.id, doc.data()) : null;
}

export async function getAllEmployers(): Promise<Employer[]> {
  const snap = await adminDb.collection(EMPLOYERS).get();
  return snap.docs.map((d) => toEmployer(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name));
}

export type EmployerInput = Omit<Employer, "id" | "createdAt" | "updatedAt">;

export async function upsertEmployer(id: string | null, input: Partial<EmployerInput>): Promise<string> {
  const docId = id ?? newId();
  const ref = adminDb.collection(EMPLOYERS).doc(docId);
  const exists = (await ref.get()).exists;
  const now = new Date();
  await ref.set(pruneUndefined({ ...input, updatedAt: now, ...(exists ? {} : { createdAt: now }) }), { merge: true });
  // Keep the denormalised employer name on postings in sync.
  if (exists && input.name) {
    const opps = await adminDb.collection(OPPS).where("employerId", "==", docId).get();
    await Promise.all(opps.docs.map((d) => d.ref.set({ employerName: input.name }, { merge: true })));
  }
  return docId;
}

// ---------- Config ----------

export async function setPortalConfig(patch: Partial<PortalConfig>, by: string): Promise<void> {
  await adminDb.doc("config/portal").set(pruneUndefined({ ...patch, updatedAt: new Date(), updatedBy: by }), { merge: true });
}

export async function getPortalConfig(): Promise<PortalConfig> {
  const doc = await adminDb.doc("config/portal").get();
  const d = doc.exists ? doc.data() ?? {} : {};
  return {
    season: d.season ?? DEFAULT_CONFIG.season,
    week: typeof d.week === "number" ? d.week : DEFAULT_CONFIG.week,
    requiredEvents: typeof d.requiredEvents === "number" ? d.requiredEvents : DEFAULT_CONFIG.requiredEvents,
    calendarUrl: d.calendarUrl ?? "",
  };
}
