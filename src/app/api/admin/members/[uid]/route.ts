import { staffRoute, ApiError } from "@/lib/admin/route";
import { getMember, updateMember, MemberPatch } from "@/lib/firebase/members";
import { isTeam, MemberRole, MemberStatus, MEMBER_STATUSES } from "@/lib/models/Member";
import { recordAudit } from "@/lib/firebase/audit";
import { str } from "@/lib/firebase/fs";

/** Exec edits a member's profile, teams, role, and membership status. */
export const PATCH = staffRoute(async ({ member: actor, body, params }) => {
  const target = await getMember(params.uid);
  if (!target) throw new ApiError("Member not found.", 404);
  const patch: MemberPatch = {};
  if ("firstName" in body) patch.firstName = str(body.firstName, 80).trim();
  if ("lastName" in body) patch.lastName = str(body.lastName, 80).trim();
  if (patch.firstName !== undefined || patch.lastName !== undefined) {
    const name = `${patch.firstName ?? target.firstName} ${patch.lastName ?? target.lastName}`.trim();
    if (name) patch.name = name;
  }
  if ("eid" in body) patch.eid = str(body.eid, 20).trim();
  if ("phone" in body) patch.phone = str(body.phone, 40).trim();
  if ("major" in body) patch.major = str(body.major, 120).trim();
  if ("major2" in body) patch.major2 = str(body.major2, 120).trim();
  if ("gradDate" in body) patch.gradDate = str(body.gradDate, 40).trim();
  if ("linkedin" in body) patch.linkedin = str(body.linkedin, 200).trim();
  if ("teams" in body) patch.teams = (Array.isArray(body.teams) ? body.teams : []).filter(isTeam);

  const self = actor.uid === target.uid;
  if ("role" in body && body.role !== target.role) {
    const role = body.role as MemberRole;
    if (!["member", "lead", "exec"].includes(role)) throw new ApiError("Unknown role.");
    if (self) throw new ApiError("You can't change your own role.");
    if (target.role === "admin") throw new ApiError("Admins can't be demoted from here.");
    patch.role = role;
  }
  // Director tier + title. Director needs exec/admin; demoting below exec clears it.
  const roleAfter = patch.role ?? target.role;
  const staffAfter = roleAfter === "exec" || roleAfter === "admin";
  if ("director" in body && typeof body.director === "boolean" && body.director !== target.director) {
    if (self) throw new ApiError("You can't change your own director status.");
    if (body.director && !staffAfter) throw new ApiError("Only execs can be directors.");
    patch.director = body.director;
  }
  if (!staffAfter && target.director) patch.director = false;
  if ("title" in body) patch.title = str(body.title, 80).trim();

  if ("status" in body && body.status !== target.status) {
    if (!MEMBER_STATUSES.includes(body.status)) throw new ApiError("Unknown status.");
    if (self) throw new ApiError("You can't change your own membership status.");
    patch.status = body.status as MemberStatus;
  }

  await updateMember(target.uid, patch);
  const teamsChanged = patch.teams !== undefined && patch.teams.join() !== target.teams.join();
  const what = [
    patch.role ? `role → ${patch.role}` : "",
    patch.director !== undefined ? `director → ${patch.director ? "yes" : "no"}` : "",
    patch.title !== undefined && patch.title !== target.title ? `title → ${patch.title || "none"}` : "",
    teamsChanged ? `teams → ${patch.teams!.length ? patch.teams!.join(", ") : "none"}` : "",
    patch.status ? `status → ${patch.status}` : "",
  ].filter(Boolean).join(", ") || "profile details";
  await recordAudit({ source: "console", actorUid: actor.uid, actorName: actor.name, action: patch.role || patch.director !== undefined ? "member.role" : patch.status ? "member.status" : "member.update", target: target.uid, detail: `${target.name}: ${what}` });
  return { ok: true };
});
