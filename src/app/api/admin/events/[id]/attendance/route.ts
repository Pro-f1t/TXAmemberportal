import { staffRoute, ApiError } from "@/lib/admin/route";
import { getEvent, setAttendance, AttendanceAction } from "@/lib/firebase/portal";
import { getMember } from "@/lib/firebase/members";
import { recordAudit } from "@/lib/firebase/audit";
import { clearCheckin, foldCheckins } from "@/lib/firebase/checkins";
import { str } from "@/lib/firebase/fs";

const ACTIONS: AttendanceAction[] = ["attended", "unattended", "excused", "unexcused"];

/** Exec marks a member attended / excused for an event. */
export const POST = staffRoute(async ({ member, body, params }) => {
  const event = await getEvent(params.id);
  if (!event) throw new ApiError("Event not found.", 404);
  const uid = str(body.uid, 128);
  const target = await getMember(uid);
  if (!target) throw new ApiError("Member not found.", 404);
  const action = body.action as AttendanceAction;
  if (!ACTIONS.includes(action)) throw new ApiError("Unknown action.");
  // Merge pending QR check-ins first so an un-mark isn't undone by a later merge.
  await foldCheckins(event.id);
  await setAttendance(event.id, uid, action);
  if (action === "unattended" || action === "excused") await clearCheckin(event.id, uid);
  await recordAudit({ source: "console", actorUid: member.uid, actorName: member.name, action: `attendance.${action}`, target: event.id, detail: `${target.name} · ${event.title}` });
  return { ok: true };
});
