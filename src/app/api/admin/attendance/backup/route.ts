import { staffRoute, ApiError } from "@/lib/admin/route";
import { getEvent } from "@/lib/firebase/portal";
import { setBackup } from "@/lib/firebase/checkins";
import { recordAudit } from "@/lib/firebase/audit";

// Break-glass: arm a static check-in code for one event for 15 minutes (it
// disarms itself). Deliberately never always-on — that would defeat rotation.
export const POST = staffRoute(async ({ member, body }) => {
  const event = typeof body.eventId === "string" ? await getEvent(body.eventId) : null;
  if (!event) throw new ApiError("Unknown event.");
  if (typeof body.armed !== "boolean") throw new ApiError("Missing armed flag.");
  await setBackup(event.id, body.armed);
  await recordAudit({ source: "console", actorUid: member.uid, actorName: member.name, action: body.armed ? "attendance.backup.arm" : "attendance.backup.disarm", target: event.id, detail: event.title });
  return { ok: true };
});
