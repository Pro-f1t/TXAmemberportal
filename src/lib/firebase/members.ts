import { adminDb } from "./admin";
import { toDate, toDateOr, pruneUndefined } from "./fs";
import { Member, MemberRole, MemberStatus, Resume, Team, isTeam, MEMBER_ROLES, MEMBER_STATUSES } from "@/lib/models/Member";

const MEMBERS = "members";
const INVITES = "invites";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toResume(r: any): Resume {
  return {
    id: String(r.id),
    fileName: String(r.fileName ?? "resume.pdf"),
    url: String(r.url ?? ""),
    size: Number(r.size ?? 0),
    uploadedAt: toDateOr(r.uploadedAt, new Date(0)),
    assignedTeams: (Array.isArray(r.assignedTeams) ? r.assignedTeams : []).filter(isTeam),
    isDefault: !!r.isDefault,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toMember(data: any): Member {
  const name = data.name ?? "NA";
  const [first, ...rest] = String(name).split(" ");
  return {
    uid: data.uid,
    email: data.email ?? "",
    name,
    firstName: data.firstName ?? first ?? "",
    lastName: data.lastName ?? rest.join(" "),
    role: MEMBER_ROLES.includes(data.role) ? (data.role as MemberRole) : "member",
    status: MEMBER_STATUSES.includes(data.status) ? (data.status as MemberStatus) : "pending",
    teams: (Array.isArray(data.teams) ? data.teams : []).filter(isTeam),
    major: data.major ?? "",
    major2: data.major2 ?? "",
    gradDate: data.gradDate ?? "",
    phone: data.phone ?? "",
    eid: data.eid ?? "",
    linkedin: data.linkedin ?? "",
    photoUrl: data.photoUrl ?? "",
    resumes: (Array.isArray(data.resumes) ? data.resumes : []).map(toResume),
    memberSince: toDateOr(data.memberSince, toDateOr(data.createdAt, new Date())),
    createdAt: toDateOr(data.createdAt, new Date()),
  };
}

function resumeToDoc(r: Resume) {
  return { id: r.id, fileName: r.fileName, url: r.url, size: r.size, uploadedAt: r.uploadedAt, assignedTeams: r.assignedTeams, isDefault: r.isDefault };
}

export async function getMember(uid: string): Promise<Member | null> {
  const doc = await adminDb.collection(MEMBERS).doc(uid).get();
  if (!doc.exists) return null;
  return toMember({ uid, ...doc.data() });
}

/** Every member, name-sorted. ~150 docs; fine to read whole. */
export async function getAllMembers(): Promise<Member[]> {
  const snap = await adminDb.collection(MEMBERS).get();
  return snap.docs
    .map((d) => toMember({ uid: d.id, ...d.data() }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function createMember(m: Partial<Member> & { uid: string; email: string; name: string }): Promise<void> {
  await adminDb.collection(MEMBERS).doc(m.uid).set(
    pruneUndefined({
      uid: m.uid,
      email: m.email,
      name: m.name,
      firstName: m.firstName ?? m.name.split(" ")[0] ?? "",
      lastName: m.lastName ?? m.name.split(" ").slice(1).join(" "),
      role: m.role ?? "member",
      status: m.status ?? "pending",
      teams: m.teams ?? [],
      major: m.major ?? "",
      major2: m.major2 ?? "",
      gradDate: m.gradDate ?? "",
      phone: m.phone ?? "",
      eid: m.eid ?? "",
      linkedin: m.linkedin ?? "",
      photoUrl: m.photoUrl ?? "",
      resumes: (m.resumes ?? []).map(resumeToDoc),
      memberSince: m.memberSince ?? new Date(),
      createdAt: m.createdAt ?? new Date(),
    }),
    { merge: true }
  );
}

export type MemberPatch = Partial<
  Pick<Member, "name" | "firstName" | "lastName" | "role" | "status" | "teams" | "major" | "major2" | "gradDate" | "phone" | "eid" | "linkedin" | "photoUrl">
>;

export async function updateMember(uid: string, patch: MemberPatch): Promise<void> {
  await adminDb.collection(MEMBERS).doc(uid).set(pruneUndefined({ ...patch }), { merge: true });
}

export async function setMemberResumes(uid: string, resumes: Resume[]): Promise<void> {
  await adminDb.collection(MEMBERS).doc(uid).set({ resumes: resumes.map(resumeToDoc) }, { merge: true });
}

// ---- Invites: exec pre-approves an email; first sign-in with it becomes an
// active member with these fields, and the invite is consumed.

export interface Invite {
  email: string; // lower-case, doc id
  name: string;
  teams: Team[];
  role: MemberRole;
  invitedBy: string;
  createdAt: Date;
}

export async function getInvites(): Promise<Invite[]> {
  const snap = await adminDb.collection(INVITES).get();
  return snap.docs
    .map((d) => {
      const x = d.data();
      return {
        email: d.id,
        name: x.name ?? "",
        teams: (Array.isArray(x.teams) ? x.teams : []).filter(isTeam),
        role: MEMBER_ROLES.includes(x.role) ? (x.role as MemberRole) : "member",
        invitedBy: x.invitedBy ?? "",
        createdAt: toDate(x.createdAt) ?? new Date(),
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function getInvite(email: string): Promise<Invite | null> {
  const doc = await adminDb.collection(INVITES).doc(email.toLowerCase()).get();
  if (!doc.exists) return null;
  const x = doc.data()!;
  return {
    email: doc.id,
    name: x.name ?? "",
    teams: (Array.isArray(x.teams) ? x.teams : []).filter(isTeam),
    role: MEMBER_ROLES.includes(x.role) ? (x.role as MemberRole) : "member",
    invitedBy: x.invitedBy ?? "",
    createdAt: toDate(x.createdAt) ?? new Date(),
  };
}

export async function upsertInvite(inv: Omit<Invite, "createdAt">): Promise<void> {
  await adminDb.collection(INVITES).doc(inv.email.toLowerCase()).set(
    { name: inv.name, teams: inv.teams, role: inv.role, invitedBy: inv.invitedBy, createdAt: new Date() },
    { merge: true }
  );
}

export async function deleteInvite(email: string): Promise<void> {
  await adminDb.collection(INVITES).doc(email.toLowerCase()).delete();
}
