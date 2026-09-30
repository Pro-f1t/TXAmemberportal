import { staffRoute, ApiError } from "@/lib/admin/route";
import { upsertOpportunity, getEmployer, getOpportunity, deleteOpportunity, OpportunityInput } from "@/lib/firebase/portal";
import { OPPORTUNITY_STATUSES, OpportunityStatus, PostingQuestion, MAX_QUESTIONS, isPastDeadline } from "@/lib/models/Portal";
import { newId } from "@/lib/firebase/fs";
import { isTeam } from "@/lib/models/Member";
import { recordAudit } from "@/lib/firebase/audit";
import { str, bool, dateInput } from "@/lib/firebase/fs";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function parse(body: any): Promise<Partial<OpportunityInput>> {
  const out: Partial<OpportunityInput> = {};
  if ("title" in body) out.title = str(body.title, 200).trim();
  if ("employerId" in body) {
    out.employerId = str(body.employerId, 40);
    const emp = out.employerId ? await getEmployer(out.employerId) : null;
    out.employerName = emp?.name ?? "";
  }
  if ("teams" in body) out.teams = (Array.isArray(body.teams) ? body.teams : []).filter(isTeam);
  if ("audienceTeams" in body) out.audienceTeams = (Array.isArray(body.audienceTeams) ? body.audienceTeams : []).filter(isTeam);
  if ("commitment" in body) out.commitment = str(body.commitment, 120).trim();
  if ("closesAt" in body) out.closesAt = dateInput(body.closesAt);
  if ("status" in body) {
    if (!OPPORTUNITY_STATUSES.includes(body.status)) throw new ApiError("Unknown status.");
    out.status = body.status as OpportunityStatus;
  }
  if ("publishAt" in body) out.publishAt = dateInput(body.publishAt);
  if ("previewImageUrl" in body) out.previewImageUrl = str(body.previewImageUrl, 2000).trim();
  if ("summary" in body) out.summary = str(body.summary, 1000).trim();
  if ("description" in body) out.description = str(body.description, 20000);
  if ("requiresTeamResume" in body) out.requiresTeamResume = bool(body.requiresTeamResume, true);
  if ("pinned" in body) out.pinned = bool(body.pinned);
  if ("questions" in body) {
    const raw = Array.isArray(body.questions) ? body.questions : [];
    if (raw.length > MAX_QUESTIONS) throw new ApiError(`Keep it to ${MAX_QUESTIONS} questions.`);
    out.questions = raw
      .map((q: any): PostingQuestion => ({ id: str(q?.id, 40) || newId(), label: str(q?.label, 200).trim(), type: q?.type === "long" ? "long" : "short", required: bool(q?.required) }))
      .filter((q: PostingQuestion) => q.label.length > 0);
  }
  if (out.status === "scheduled" && !out.publishAt) throw new ApiError("Set a publish date for a scheduled posting.");
  return out;
}

/** Create a posting. */
export const POST = staffRoute(async ({ member, body }) => {
  const input = await parse(body);
  if (!input.title) throw new ApiError("Give the posting a title.");
  const id = await upsertOpportunity(null, { status: "draft", teams: [], audienceTeams: [], requiresTeamResume: true, pinned: false, questions: [], ...input }, { uid: member.uid, name: member.name });
  await recordAudit({ source: "console", actorUid: member.uid, actorName: member.name, action: "opportunity.create", target: id, detail: input.title });
  return { ok: true, id };
});

/** Update a posting (partial). */
export const PATCH = staffRoute(async ({ member, body }) => {
  const id = str(body.id, 40);
  const prev = await getOpportunity(id);
  if (!prev) throw new ApiError("Posting not found.", 404);
  const input = await parse(body);
  await upsertOpportunity(id, input, { uid: member.uid, name: member.name });
  const action = input.status && input.status !== prev.status ? `opportunity.${input.status}` : "opportunity.update";
  await recordAudit({ source: "console", actorUid: member.uid, actorName: member.name, action, target: id, detail: input.title ?? prev.title });
  return { ok: true, id };
});

/** Delete an archived posting for good, along with its applications. Live, scheduled and draft postings must be archived first. */
export const DELETE = staffRoute(async ({ member, body }) => {
  const id = str(body.id, 40);
  const prev = await getOpportunity(id);
  if (!prev) throw new ApiError("Posting not found.", 404);
  if (prev.status !== "closed" && !isPastDeadline(prev)) throw new ApiError("Only archived postings can be deleted. Close this one first.");
  const removed = await deleteOpportunity(id);
  await recordAudit({ source: "console", actorUid: member.uid, actorName: member.name, action: "opportunity.delete", target: id, detail: `${prev.title} (${prev.employerName || "no employer"}) · ${removed} application${removed === 1 ? "" : "s"} removed` });
  return { ok: true };
});
