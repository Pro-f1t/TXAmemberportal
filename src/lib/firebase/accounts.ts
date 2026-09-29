import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminAuth } from "./admin";

/**
 * Permanently remove a member account: their profile, applications, QR
 * check-ins, every RSVP / attendance / excuse mark on events, and their Google
 * sign-in record (which also ends any open session). If the same Google account
 * signs in again later, it starts over as a brand-new pending account.
 * Uploaded files (headshot, resumes) are left in Storage: applications that were
 * already sent may still link to them, and their paths carry the uid.
 */
export async function deleteMemberAccount(uid: string): Promise<{ applications: number; events: number }> {
  const [apps, checkins, rsvp, attended, excused] = await Promise.all([
    adminDb.collection("applications").where("userId", "==", uid).get(),
    adminDb.collection("checkins").where("uid", "==", uid).get(),
    adminDb.collection("events").where("rsvpUids", "array-contains", uid).get(),
    adminDb.collection("events").where("attendedUids", "array-contains", uid).get(),
    adminDb.collection("events").where("excusedUids", "array-contains", uid).get(),
  ]);
  const eventIds = new Set([...rsvp.docs, ...attended.docs, ...excused.docs].map((d) => d.id));

  const writes: ((b: FirebaseFirestore.WriteBatch) => void)[] = [
    (b) => b.delete(adminDb.collection("members").doc(uid)),
    ...apps.docs.map((d) => (b: FirebaseFirestore.WriteBatch) => b.delete(d.ref)),
    ...checkins.docs.map((d) => (b: FirebaseFirestore.WriteBatch) => b.delete(d.ref)),
    ...[...eventIds].map((id) => (b: FirebaseFirestore.WriteBatch) =>
      b.set(adminDb.collection("events").doc(id), { rsvpUids: FieldValue.arrayRemove(uid), attendedUids: FieldValue.arrayRemove(uid), excusedUids: FieldValue.arrayRemove(uid) }, { merge: true })),
  ];
  for (let i = 0; i < writes.length; i += 450) {
    const batch = adminDb.batch();
    writes.slice(i, i + 450).forEach((w) => w(batch));
    await batch.commit();
  }

  try {
    await adminAuth.revokeRefreshTokens(uid);
    await adminAuth.deleteUser(uid);
  } catch (e) {
    if ((e as { code?: string }).code !== "auth/user-not-found") throw e;
  }
  return { applications: apps.size, events: eventIds.size };
}
