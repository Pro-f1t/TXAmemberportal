import { staffRoute, ApiError } from "@/lib/admin/route";
import { upsertEvent, getEvent, EventInput } from "@/lib/firebase/portal";
import { EVENT_TYPES, EventType } from "@/lib/models/Portal";
import { isTeam } from "@/lib/models/Member";
import { recordAudit } from "@/lib/firebase/audit";
import { str, bool } from "@/lib/firebase/fs";
import { buildStartsAt } from "@/lib/utils/time";

/* eslint-disable @typescript-eslint/no-explicit-any */

function parse(body: any): Partial<EventInput> {
  const out: Partial<EventInput> = {};
  if ("title" in body) out.title = str(body.title, 200).trim();
  if ("timeLabel" in body) out.timeLabel = str(body.timeLabel, 40).trim();
  if ("date" in body) {
    const startsAt = buildStartsAt(str(body.date, 10), out.timeLabel ?? str(body.timeLabel, 40));
    if (!startsAt) throw new ApiError("Pick a valid date.");
    out.startsAt = startsAt;
  }
  if ("location" in body) out.location = str(body.location, 120).trim();
  if ("capacity" in body) out.capacity = body.capacity === null || body.capacity === "" ? null : Math.max(0, Math.floor(Number(body.capacity)) || 0);
  if ("type" in body) {
    if (!EVENT_TYPES.includes(body.type)) throw new ApiError("Unknown event type.");
    out.type = body.type as EventType;
  }
  if ("audienceTeams" in body) out.audienceTeams = (Array.isArray(body.audienceTeams) ? body.audienceTeams : []).filter(isTeam);
  if ("description" in body) out.description = str(body.description, 5000);
  if ("countsForAttendance" in body) out.countsForAttendance = bool(body.countsForAttendance, true);
  if ("pinned" in body) out.pinned = bool(body.pinned);
  if ("rsvpUrl" in body) {
    const link = str(body.rsvpUrl, 500).trim();
    if (link && !/^https?:\/\//.test(link)) throw new ApiError("RSVP link must start with http:// or https://");
    out.rsvpUrl = link;
  }
  if ("status" in body) out.status = body.status === "published" ? "published" : "draft";
  return out;
}

export const POST = staffRoute(async ({ member, body }) => {
  const input = parse(body);
  if (!input.title) throw new ApiError("Give the event a title.");
  if (!input.startsAt) throw new ApiError("Pick a date.");
  const id = await upsertEvent(null, { status: "draft", audienceTeams: [], countsForAttendance: true, pinned: false, rsvpUrl: "", type: "workshop", timeLabel: "", location: "", capacity: null, description: "", ...input });
  await recordAudit({ actorUid: member.uid, actorName: member.name, action: "event.create", target: id, detail: input.title });
  return { ok: true, id };
});

export const PATCH = staffRoute(async ({ member, body }) => {
  const id = str(body.id, 40);
  const prev = await getEvent(id);
  if (!prev) throw new ApiError("Event not found.", 404);
  const input = parse(body);
  await upsertEvent(id, input);
  const action = input.status && input.status !== prev.status ? `event.${input.status}` : "event.update";
  await recordAudit({ actorUid: member.uid, actorName: member.name, action, target: id, detail: input.title ?? prev.title });
  return { ok: true, id };
});
