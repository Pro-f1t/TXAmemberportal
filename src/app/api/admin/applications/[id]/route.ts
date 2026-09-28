import { staffRoute, ApiError } from "@/lib/admin/route";
import { getApplication, updateApplication } from "@/lib/firebase/portal";
import { APPLICATION_STATUSES, ApplicationStatus } from "@/lib/models/Portal";
import { recordAudit } from "@/lib/firebase/audit";
import { str, dateInput } from "@/lib/firebase/fs";

/** Exec moves an application along, or sets its next-step details. */
export const PATCH = staffRoute(async ({ member, body, params }) => {
  const app = await getApplication(params.id);
  if (!app) throw new ApiError("Application not found.", 404);
  const patch: Partial<{ status: ApplicationStatus; nextStep: string; nextStepAt: Date | null; joinLink: string }> = {};
  if ("status" in body) {
    if (!APPLICATION_STATUSES.includes(body.status)) throw new ApiError("Unknown status.");
    patch.status = body.status;
  }
  if ("nextStep" in body) patch.nextStep = str(body.nextStep, 500).trim();
  if ("nextStepAt" in body) patch.nextStepAt = dateInput(body.nextStepAt);
  if ("joinLink" in body) {
    const link = str(body.joinLink, 500).trim();
    if (link && !/^https?:\/\//.test(link)) throw new ApiError("Join link must start with http:// or https://");
    patch.joinLink = link;
  }
  await updateApplication(app.id, patch);
  await recordAudit({ source: "console",
    actorUid: member.uid, actorName: member.name,
    action: patch.status ? `application.status.${patch.status}` : "application.nextstep",
    target: app.id, detail: `${app.userName} · ${app.opportunityTitle}`,
  });
  return { ok: true };
});
