import { adminDb } from "./admin";

export interface AuditEntry {
  // "console" = an exec did it from the console (shown on /admin/activity).
  // "member"  = a member's own action (applying, accepting, open sign-up) — kept, not shown.
  source?: "console" | "member";
  actorUid: string;
  actorName?: string;
  action: string;
  target?: string;
  detail?: string;
  at?: Date;
}

/** Record an admin action. Swallows its own errors — never fails the request. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await adminDb.collection("audit_log").add({ ...entry, at: entry.at ?? new Date() });
  } catch {
    /* audit is best-effort */
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toEntry(id: string, d: any): AuditEntry & { id: string } {
  return { id, actorUid: d.actorUid, actorName: d.actorName, action: d.action, target: d.target, detail: d.detail, at: d.at?.toDate ? d.at.toDate() : d.at };
}

export async function getRecentAudit(limit = 100): Promise<(AuditEntry & { id: string })[]> {
  const snap = await adminDb.collection("audit_log").orderBy("at", "desc").limit(limit).get();
  return snap.docs.map((doc) => toEntry(doc.id, doc.data()));
}

export interface ActivityRow { id: string; at: Date; actorUid: string; actorName: string; action: string; target: string; detail: string }

// Entries written before `source` existed: these actions only ever came from members.
const MEMBER_ACTIONS = new Set(["application.submit", "application.accept", "application.decline", "member.join"]);

function isConsole(d: FirebaseFirestore.DocumentData): boolean {
  if (d.source) return d.source === "console";
  if (MEMBER_ACTIONS.has(d.action)) return false;
  // Legacy open-sign-up self-activation (actor === target).
  if (d.action === "member.status" && d.actorUid && d.actorUid === d.target) return false;
  return true;
}

/** Newest-first console actions for the Activity page. */
export async function getConsoleActivity(limit = 600): Promise<ActivityRow[]> {
  const snap = await adminDb.collection("audit_log").orderBy("at", "desc").limit(limit).get();
  return snap.docs
    .filter((doc) => isConsole(doc.data()))
    .map((doc) => {
      const d = doc.data();
      const at = d.at?.toDate ? d.at.toDate() : new Date(d.at ?? 0);
      return { id: doc.id, at, actorUid: d.actorUid ?? "", actorName: d.actorName ?? "Unknown", action: d.action ?? "", target: d.target ?? "", detail: d.detail ?? "" };
    });
}
