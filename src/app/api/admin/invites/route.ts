import { staffRoute, ApiError } from "@/lib/admin/route";
import { upsertInvite, deleteInvite, getAllMembers } from "@/lib/firebase/members";
import { isTeam, MemberRole } from "@/lib/models/Member";
import { recordAudit } from "@/lib/firebase/audit";
import { str } from "@/lib/firebase/fs";

/** Pre-approve an email: the first sign-in with it becomes an active member. */
export const POST = staffRoute(async ({ member: actor, body }) => {
  const email = str(body.email, 200).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError("Enter a valid email.");
  const role = (["member", "lead", "exec"].includes(body.role) ? body.role : "member") as MemberRole;
  const existing = (await getAllMembers()).find((m) => m.email.toLowerCase() === email);
  if (existing) throw new ApiError(`${existing.name} already has an account — open their profile to change teams or status.`);
  await upsertInvite({ email, name: str(body.name, 120).trim(), teams: (Array.isArray(body.teams) ? body.teams : []).filter(isTeam), role, invitedBy: actor.uid });
  await recordAudit({ source: "console", actorUid: actor.uid, actorName: actor.name, action: "member.invite", target: email, detail: role });
  return { ok: true };
});

export const DELETE = staffRoute(async ({ member: actor, body }) => {
  const email = str(body.email, 200).trim().toLowerCase();
  if (!email) throw new ApiError("Missing email.");
  await deleteInvite(email);
  await recordAudit({ source: "console", actorUid: actor.uid, actorName: actor.name, action: "member.uninvite", target: email });
  return { ok: true };
});
