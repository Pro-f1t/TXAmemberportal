import { redirect } from "next/navigation";
import { requireUser, requireStaff, isStaff, guardErrorStatus } from "./guard";
import type { Member } from "@/lib/models/Member";

/**
 * For member screens: signed-in AND active (staff always pass). Redirects to
 * login when signed out and to /pending when the account isn't active yet.
 */
export async function memberPage(next: string): Promise<Member> {
  let member: Member;
  try {
    ({ member } = await requireUser());
  } catch {
    redirect(`/auth/login?next=${encodeURIComponent(next)}`);
  }
  if (member.status !== "active" && !isStaff(member)) redirect("/pending");
  return member;
}

/** For console screens: staff only. Non-staff go back to the member home. */
export async function staffPage(): Promise<Member> {
  try {
    const { member } = await requireStaff();
    return member;
  } catch (error) {
    if (guardErrorStatus(error) === 403) redirect("/");
    redirect("/auth/login?next=/admin");
  }
}
