import { staffRoute, ApiError } from "@/lib/admin/route";
import { setPortalConfig } from "@/lib/firebase/portal";
import { PortalConfig } from "@/lib/models/Portal";
import { recordAudit } from "@/lib/firebase/audit";
import { str } from "@/lib/firebase/fs";

/** Portal settings: season label, week, attendance requirement, calendar link. */
export const PATCH = staffRoute(async ({ member, body }) => {
  const patch: Partial<PortalConfig> = {};
  if ("season" in body) patch.season = str(body.season, 40).trim() || "Fall 2026";
  if ("week" in body) patch.week = Math.max(0, Math.min(52, Math.floor(Number(body.week)) || 0));
  if ("requiredEvents" in body) patch.requiredEvents = Math.max(0, Math.min(30, Math.floor(Number(body.requiredEvents)) || 0));
  if ("calendarUrl" in body) {
    const link = str(body.calendarUrl, 500).trim();
    if (link && !/^https?:\/\//.test(link)) throw new ApiError("Calendar link must start with http:// or https://");
    patch.calendarUrl = link;
  }
  await setPortalConfig(patch, member.uid);
  await recordAudit({ actorUid: member.uid, actorName: member.name, action: "config.update", detail: Object.keys(patch).join(", ") });
  return { ok: true };
});
