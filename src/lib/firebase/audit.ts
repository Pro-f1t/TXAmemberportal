import { adminDb } from "./admin";

export interface AuditEntry {
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
