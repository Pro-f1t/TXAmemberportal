import { staffRoute, ApiError } from "@/lib/admin/route";
import { upsertAnnouncement, AnnouncementInput } from "@/lib/firebase/portal";
import { ANNOUNCEMENT_LABELS, AnnouncementLabel } from "@/lib/models/Portal";
import { isTeam } from "@/lib/models/Member";
import { recordAudit } from "@/lib/firebase/audit";
import { str, bool, dateInput } from "@/lib/firebase/fs";

/* eslint-disable @typescript-eslint/no-explicit-any */

function parse(body: any): Partial<AnnouncementInput> {
  const out: Partial<AnnouncementInput> = {};
  if ("title" in body) out.title = str(body.title, 200).trim();
  if ("body" in body) out.body = str(body.body, 5000);
  if ("label" in body) {
    if (!ANNOUNCEMENT_LABELS.includes(body.label)) throw new ApiError("Unknown label.");
    out.label = body.label as AnnouncementLabel;
  }
  if ("audienceTeams" in body) out.audienceTeams = (Array.isArray(body.audienceTeams) ? body.audienceTeams : []).filter(isTeam);
  if ("status" in body) out.status = body.status === "live" ? "live" : body.status === "scheduled" ? "scheduled" : "draft";
  if ("publishAt" in body) out.publishAt = dateInput(body.publishAt);
  if ("expiresAt" in body) out.expiresAt = dateInput(body.expiresAt);
  if ("emailMembers" in body) out.emailMembers = bool(body.emailMembers);
  if (out.status === "scheduled" && !out.publishAt) throw new ApiError("Set a publish time to schedule.");
  return out;
}

export const POST = staffRoute(async ({ member, body }) => {
  const input = parse(body);
  if (!input.title) throw new ApiError("Give it a title.");
  const id = await upsertAnnouncement(null, { status: "draft", label: "update", audienceTeams: [], emailMembers: false, publishAt: null, expiresAt: null, body: "", ...input }, { uid: member.uid, name: member.name });
  await recordAudit({ actorUid: member.uid, actorName: member.name, action: `announcement.${input.status ?? "draft"}`, target: id, detail: input.title });
  return { ok: true, id };
});

export const PATCH = staffRoute(async ({ member, body }) => {
  const id = str(body.id, 40);
  if (!id) throw new ApiError("Missing id.");
  const input = parse(body);
  await upsertAnnouncement(id, input, { uid: member.uid, name: member.name });
  await recordAudit({ actorUid: member.uid, actorName: member.name, action: `announcement.${input.status ?? "update"}`, target: id, detail: input.title });
  return { ok: true, id };
});
