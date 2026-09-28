import { cache } from "react";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { getMember } from "@/lib/firebase/members";
import { STAFF_ROLES, Member } from "@/lib/models/Member";

/**
 * Verify the Firebase session cookie server-side and return the member.
 * Throws "Unauthorized" (→401) when there is no/expired/invalid session,
 * "Forbidden: …" (→403) on a role/status mismatch.
 */
// Memoised per request: the console layout and the page both guard, and each
// check is a network round-trip to Firebase Auth (revocation check) plus a
// Firestore read. cache() makes the second call free. Scoped to one request,
// so a role change is still seen on the very next navigation.
const requireSession = cache(async function requireSession(): Promise<{ uid: string; member: Member }> {
  const store = await cookies();
  const sessionCookie = store.get("session")?.value;
  if (!sessionCookie) throw new Error("Unauthorized");

  let uid: string;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    uid = decoded.uid;
  } catch {
    throw new Error("Unauthorized");
  }

  const member = await getMember(uid);
  if (!member) throw new Error("Unauthorized");
  return { uid, member };
});

/** Any signed-in account, regardless of membership status. */
export async function requireUser() {
  return requireSession();
}

export function isStaff(member: Member): boolean {
  return STAFF_ROLES.includes(member.role);
}

/** An active member (or any staff). Pending / inactive accounts are refused. */
export async function requireMember() {
  const result = await requireSession();
  if (result.member.status !== "active" && !isStaff(result.member)) {
    throw new Error("Forbidden: Membership not active");
  }
  return result;
}

export async function requireStaff() {
  const result = await requireSession();
  if (!isStaff(result.member)) throw new Error("Forbidden: Staff access required");
  return result;
}

export async function requireAdmin() {
  const result = await requireSession();
  if (result.member.role !== "admin") throw new Error("Forbidden: Admin access required");
  return result;
}

/** Map a guard error to an HTTP status; null when it's some other error. */
export function guardErrorStatus(error: unknown): 401 | 403 | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "Unauthorized") return 401;
  if (error.message.startsWith("Forbidden")) return 403;
  return null;
}
