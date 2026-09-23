import { staffRoute, ApiError } from "@/lib/admin/route";
import { getEvent, setAttendance, AttendanceAction } from "@/lib/firebase/portal";
import { getMember } from "@/lib/firebase/members";
import { recordAudit } from "@/lib/firebase/audit";
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
  await setAttendance(event.id, uid, action);
  await recordAudit({ actorUid: member.uid, actorName: member.name, action: `attendance.${action}`, target: event.id, detail: `${target.name} · ${event.title}` });
  return { ok: true };
});
