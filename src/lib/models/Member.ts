// The 6 field teams, FLAT. Same values as the recruiting portal (Project03) so
// an accepted applicant's team names carry over verbatim. These strings are the
// Firestore keys; the short labels below are for chips and meta lines.
export enum Team {
  BUSINESS = "Business, Finance & Consulting",
  GOVERNMENT = "Government, Law & Public Affairs",
  MARKETING = "Marketing & Communications",
  SOFTWARE = "Software, AI & Technology",
  ENGINEERING = "Engineering & Manufacturing",
  HEALTHCARE = "Healthcare & Life Sciences",
}

export const TEAMS: Team[] = Object.values(Team);

export const TEAM_SHORT: Record<Team, string> = {
  [Team.BUSINESS]: "Business & Finance",
  [Team.GOVERNMENT]: "Government & Law",
  [Team.MARKETING]: "Marketing & Comms",
  [Team.SOFTWARE]: "Software & AI",
  [Team.ENGINEERING]: "Engineering",
  [Team.HEALTHCARE]: "Healthcare",
};

export function teamShort(t: string): string {
  return TEAM_SHORT[t as Team] ?? t;
}

export function isTeam(v: unknown): v is Team {
  return typeof v === "string" && (TEAMS as string[]).includes(v);
}

// member: a regular member. lead: a field team lead (member-level access, listed
// as the lead of their teams). exec / admin: the console. Any exec can grant or
// revoke exec (never their own); admin is the same plus it can't be demoted.
export type MemberRole = "member" | "lead" | "exec" | "admin";
export const MEMBER_ROLES: MemberRole[] = ["member", "lead", "exec", "admin"];

// Roster order everywhere members are listed: exec (admin sits with exec),
// then field team leads, then members; alphabetical within each group.
// Rank 0 is kept free for directors once that tier exists.
const ROLE_ORDER: Record<MemberRole, number> = { admin: 1, exec: 1, lead: 2, member: 3 };

export function byRoleThenName(a: { role: MemberRole; name: string }, b: { role: MemberRole; name: string }): number {
  return ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || (a.name || "").localeCompare(b.name || "");
}
// "Staff" = everyone who can open the exec console. Keep in sync with proxy.ts
// and Nav.tsx (middleware can't import from here cleanly).
export const STAFF_ROLES: MemberRole[] = ["exec", "admin"];
export const ROLE_LABEL: Record<MemberRole, string> = {
  member: "Member",
  lead: "Field team lead",
  exec: "Exec",
  admin: "Admin",
};

// pending: signed in with Google but not yet approved by exec (sees /pending).
// active: full member. inactive: alumni / removed — can sign in, sees /pending.
export type MemberStatus = "active" | "pending" | "inactive";
export const MEMBER_STATUSES: MemberStatus[] = ["active", "pending", "inactive"];

export interface Resume {
  id: string;
  fileName: string;
  url: string;
  size: number; // bytes
  uploadedAt: Date;
  assignedTeams: Team[];
  isDefault: boolean;
}

export const MAX_RESUMES = 5;

export interface Member {
  uid: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: MemberRole;
  status: MemberStatus;
  teams: Team[];
  major: string;
  major2: string; // optional second major
  gradDate: string; // display string, e.g. "May 2028"
  phone: string;
  eid: string; // UT EID
  linkedin: string;
  photoUrl: string;
  resumes: Resume[];
  memberSince: Date;
  createdAt: Date;
}

/** Resolve which resume an employer/team sees: the one assigned to the team,
 *  else the member's default, else null. */
export function resumeForTeam(member: Pick<Member, "resumes">, team: Team | null | undefined): Resume | null {
  const resumes = member.resumes ?? [];
  if (team) {
    const assigned = resumes.find((r) => r.assignedTeams?.includes(team));
    if (assigned) return assigned;
  }
  return resumes.find((r) => r.isDefault) ?? resumes[0] ?? null;
}

/** Empty = everyone. Otherwise the member must share at least one team. */
export function visibleTo(audienceTeams: Team[] | undefined, memberTeams: Team[]): boolean {
  if (!audienceTeams || audienceTeams.length === 0) return true;
  return audienceTeams.some((t) => memberTeams.includes(t));
}
