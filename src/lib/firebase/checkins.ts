import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";

/*
 * QR check-ins. Each scan writes its OWN small doc (`checkins/{eventId}__{uid}`)
 * instead of arrayUnion-ing onto the event: 150 phones hitting one event doc in
 * a minute would exceed Firestore's ~1 write/sec per document and start failing.
 *
 * The event's `attendedUids` stays the single source of truth for every screen.
 * `foldCheckins()` merges unmerged check-ins into it, and is only called from
 * exec-side paths (the live display's count poll, Attendance tab, roster,
 * member pages in the console), so there's effectively one writer at a time.
 * Members see their own check-in immediately via `myCheckinEventIds()`.
 */

const CHECKINS = "checkins";
const BACKUP_DOC = "config/attendanceBackup";
const BACKUP_TTL_MS = 15 * 60 * 1000;

export type CheckinMethod = "qr" | "backup";

/** Idempotent: returns "already" when this member already checked in (or was marked). */
export async function recordCheckin(eventId: string, uid: string, name: string, method: CheckinMethod, alreadyMarked: boolean): Promise<"new" | "already"> {
  if (alreadyMarked) return "already";
  try {
    await adminDb.collection(CHECKINS).doc(`${eventId}__${uid}`).create({ eventId, uid, name, method, at: new Date(), folded: false });
    return "new";
  } catch (e) {
    // ALREADY_EXISTS (gRPC 6) → a second scan.
    if ((e as { code?: number }).code === 6) return "already";
    throw e;
  }
}

/** Merge unmerged check-ins into their events' attendedUids. Cheap when there's nothing to do (1 read). */
export async function foldCheckins(eventId?: string): Promise<number> {
  let q = adminDb.collection(CHECKINS).where("folded", "==", false);
  if (eventId) q = q.where("eventId", "==", eventId);
  const snap = await q.limit(1000).get();
  if (snap.empty) return 0;

  const byEvent = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
  for (const doc of snap.docs) {
    const id = doc.get("eventId") as string;
    byEvent.set(id, [...(byEvent.get(id) ?? []), doc]);
  }
  for (const [id, docs] of byEvent) {
    // Batches cap at 500 writes: 1 event update + up to 400 check-in flags per batch.
    for (let i = 0; i < docs.length; i += 400) {
      const chunk = docs.slice(i, i + 400);
      const uids = chunk.map((d) => d.get("uid") as string);
      const batch = adminDb.batch();
      batch.set(adminDb.collection("events").doc(id), { attendedUids: FieldValue.arrayUnion(...uids), excusedUids: FieldValue.arrayRemove(...uids) }, { merge: true });
      for (const d of chunk) batch.update(d.ref, { folded: true });
      await batch.commit();
    }
  }
  return snap.size;
}

/** Event ids this member has checked into by QR (merged or not). */
export async function myCheckinEventIds(uid: string): Promise<Set<string>> {
  const snap = await adminDb.collection(CHECKINS).where("uid", "==", uid).get();
  return new Set(snap.docs.map((d) => d.get("eventId") as string));
}

/** Exec un-marks or excuses someone: drop their check-in so it can't re-merge or show as attended. */
export async function clearCheckin(eventId: string, uid: string): Promise<void> {
  await adminDb.collection(CHECKINS).doc(`${eventId}__${uid}`).delete().catch(() => {});
}

// ---- Backup code: a static QR an exec arms for 15 minutes when the projector can't run.

export async function isBackupArmed(eventId: string, now = Date.now()): Promise<boolean> {
  const doc = await adminDb.doc(BACKUP_DOC).get();
  const exp = doc.exists ? (doc.data()?.[eventId] as number | undefined) : undefined;
  return typeof exp === "number" && now < exp;
}

/** Remaining armed ms per event (absent = not armed). */
export async function getBackupState(now = Date.now()): Promise<Record<string, number>> {
  const doc = await adminDb.doc(BACKUP_DOC).get();
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(doc.exists ? doc.data() ?? {} : {})) if (typeof v === "number" && now < v) out[k] = v - now;
  return out;
}

export async function setBackup(eventId: string, armed: boolean, now = Date.now()): Promise<void> {
  await adminDb.doc(BACKUP_DOC).set({ [eventId]: armed ? now + BACKUP_TTL_MS : 0 }, { merge: true });
}
