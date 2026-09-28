import { redirect } from "next/navigation";
import { requireUser, isStaff } from "@/lib/auth/guard";
import { getPortalConfig } from "@/lib/firebase/portal";
import { updateMember } from "@/lib/firebase/members";
import { recordAudit } from "@/lib/firebase/audit";
import { CONTACT_EMAIL } from "@/data/site";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

/** Shown to signed-in accounts that aren't active members yet. */
export default async function PendingPage() {
  let member;
  try {
    ({ member } = await requireUser());
  } catch {
    redirect("/auth/login?next=/");
  }
  if (member.status === "active" || isStaff(member)) redirect("/");

  // Open sign-up: someone who signed in before approval was switched off gets in on reload.
  if (member.status === "pending" && !(await getPortalConfig()).requireApproval) {
    await updateMember(member.uid, { status: "active" });
    await recordAudit({ actorUid: member.uid, actorName: member.name, action: "member.status", target: member.uid, detail: `${member.name}: pending → active (open sign-up)` });
    redirect("/");
  }

  const inactive = member.status === "inactive";
  return (
    <section className="shell flex min-h-svh items-center justify-center py-20">
      <div className="card w-full max-w-md p-8">
        <p className="t-eyebrow">Texas Accelerate</p>
        <h1 className="t-card-title mt-3">{inactive ? "This account is inactive" : "Almost there"}</h1>
        <p className="t-body mt-3 text-muted">
          {inactive
            ? "Your membership isn't active this season. If that's a mistake, reach out to exec."
            : `You're signed in as ${member.email}. An exec needs to activate your membership before you can see postings and events — this usually happens within a day of onboarding.`}
        </p>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Member portal access")}`} className="pill pill-blue pill-sm">Email exec</a>
          <SignOutButton />
        </div>
      </div>
    </section>
  );
}
