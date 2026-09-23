import { staffRoute, ApiError } from "@/lib/admin/route";
import { upsertEmployer, getEmployer, EmployerInput } from "@/lib/firebase/portal";
import { isTeam } from "@/lib/models/Member";
import { recordAudit } from "@/lib/firebase/audit";
import { str } from "@/lib/firebase/fs";

/* eslint-disable @typescript-eslint/no-explicit-any */

function parse(body: any): Partial<EmployerInput> {
  const out: Partial<EmployerInput> = {};
  if ("name" in body) out.name = str(body.name, 120).trim();
  if ("contact" in body) out.contact = str(body.contact, 120).trim();
  if ("email" in body) out.email = str(body.email, 200).trim();
  if ("location" in body) out.location = str(body.location, 120).trim();
  if ("website" in body) out.website = str(body.website, 200).trim();
  if ("teams" in body) out.teams = (Array.isArray(body.teams) ? body.teams : []).filter(isTeam);
  if ("logoUrl" in body) out.logoUrl = str(body.logoUrl, 2000).trim();
  if ("status" in body) out.status = body.status === "inactive" ? "inactive" : "active";
  return out;
}

export const POST = staffRoute(async ({ member, body }) => {
  const input = parse(body);
  if (!input.name) throw new ApiError("Give the employer a name.");
  const id = await upsertEmployer(null, { status: "active", teams: [], contact: "", email: "", location: "", website: "", logoUrl: "", ...input });
  await recordAudit({ actorUid: member.uid, actorName: member.name, action: "employer.create", target: id, detail: input.name });
  return { ok: true, id };
});

export const PATCH = staffRoute(async ({ member, body }) => {
  const id = str(body.id, 40);
  const prev = await getEmployer(id);
  if (!prev) throw new ApiError("Employer not found.", 404);
  const input = parse(body);
  await upsertEmployer(id, input);
  await recordAudit({ actorUid: member.uid, actorName: member.name, action: "employer.update", target: id, detail: input.name ?? prev.name });
  return { ok: true, id };
});
