import { NextResponse } from "next/server";
import { requireMember, guardErrorStatus } from "@/lib/auth/guard";
import { getOpportunity, getApplication, createApplication, updateApplication, applicationId } from "@/lib/firebase/portal";
import { isOpportunityLive, isPastDeadline } from "@/lib/models/Portal";
import { visibleTo } from "@/lib/models/Member";
import { recordAudit } from "@/lib/firebase/audit";
import { str } from "@/lib/firebase/fs";

function fail(error: unknown) {
  const status = guardErrorStatus(error);
  if (status) return NextResponse.json({ error: status === 403 ? "Your membership isn't active." : "Not signed in" }, { status });
  return NextResponse.json({ error: error instanceof Error ? error.message : "Request failed." }, { status: 400 });
}

/** Apply to a posting with one of your resumes. */
export async function POST(request: Request) {
  try {
    const { member } = await requireMember();
    const body = await request.json();
    const opportunityId = str(body.opportunityId, 40);
    const resumeId = str(body.resumeId, 40);

    const opp = await getOpportunity(opportunityId);
    if (!opp || !isOpportunityLive(opp) || !visibleTo(opp.audienceTeams, member.teams)) throw new Error("This posting isn't open to you.");
    if (isPastDeadline(opp)) throw new Error("Applications for this posting have closed.");
    const resume = member.resumes.find((r) => r.id === resumeId);
    if (!resume) throw new Error("Pick a resume to send.");
    if (await getApplication(applicationId(member.uid, opp.id))) throw new Error("You've already applied to this posting.");
    const given: Record<string, unknown> = body.answers && typeof body.answers === "object" ? body.answers : {};
    const answers = opp.questions.map((q) => ({ id: q.id, label: q.label, value: str(given[q.id], 2000).trim() }));
    const missing = opp.questions.find((q) => q.required && !answers.find((a) => a.id === q.id)?.value);
    if (missing) throw new Error(`Please answer: ${missing.label}`);

    const id = await createApplication({
      userId: member.uid,
      userName: member.name,
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      employerName: opp.employerName,
      team: opp.teams[0] ?? null,
      resumeId: resume.id,
      resumeFileName: resume.fileName,
      status: "submitted",
      submittedAt: new Date(),
      answers,
    });
    await recordAudit({ actorUid: member.uid, actorName: member.name, action: "application.submit", target: id, detail: `${opp.title} · ${resume.fileName}` });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return fail(error);
  }
}

/** accept / decline an offer on your own application. */
export async function PATCH(request: Request) {
  try {
    const { member } = await requireMember();
    const body = await request.json();
    const app = await getApplication(str(body.applicationId, 120));
    if (!app || app.userId !== member.uid) throw new Error("Application not found.");
    if (app.status !== "offer") throw new Error("There's no open offer on this application.");
    const action = body.action === "accept" ? "placed" : body.action === "decline" ? "declined" : null;
    if (!action) throw new Error("Unknown action.");
    await updateApplication(app.id, { status: action, nextStep: action === "placed" ? "Offer accepted" : "" });
    await recordAudit({ actorUid: member.uid, actorName: member.name, action: `application.${body.action}`, target: app.id, detail: app.opportunityTitle });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
