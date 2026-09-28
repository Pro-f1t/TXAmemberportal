import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { getEvent } from "@/lib/firebase/portal";
import { recordCheckin, isBackupArmed } from "@/lib/firebase/checkins";
import { verifyPass, PASS_COOKIE } from "@/lib/attendance/token";
import { EVENT_TYPE_LABEL } from "@/lib/models/Portal";
import { eventTimeRange } from "@/lib/portal/eventTime";
import { fmtDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

/**
 * Where a scan lands. Presence must be proven by a fresh pass (from the rotating
 * QR, via /c/…) or an exec-armed backup code; a bare /checkin link with neither
 * is a stale or shared link. Signed-out scanners detour through Google sign-in
 * and come back here with the pass cookie intact.
 */
export default async function CheckInPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  const live = !!event && event.status === "published";

  const pass = (await cookies()).get(PASS_COOKIE)?.value;
  const viaPass = live && verifyPass(eventId, pass);
  const authorized = viaPass || (live && (await isBackupArmed(eventId)));

  let result: "new" | "already" | null = null;
  let name = "";
  if (authorized) {
    let member;
    try {
      ({ member } = await requireUser());
    } catch {
      redirect(`/auth/login?next=${encodeURIComponent(`/checkin/${eventId}`)}`);
    }
    name = member.name;
    result = await recordCheckin(eventId, member.uid, member.name, viaPass ? "qr" : "backup", event!.attendedUids.includes(member.uid));
  }

  return (
    <section className="shell flex min-h-svh items-center justify-center py-24">
      <div className="card w-full max-w-md p-8 text-center">
        {!live ? (
          <>
            <p className="t-eyebrow">Check-in</p>
            <h1 className="t-card-title mt-3">Event not found</h1>
            <p className="t-body mt-3 text-muted">This check-in link isn&apos;t valid. Scan the code on the screen at the event.</p>
          </>
        ) : !authorized ? (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[26px] font-bold" style={{ background: "var(--color-danger)", color: "#fff" }}>!</span>
            <h1 className="t-card-title mt-5">That code expired</h1>
            <p className="t-body mt-3 text-muted">Check-in codes change every few seconds. Point your camera at the code on the screen and scan the live one.</p>
          </>
        ) : (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[26px] font-bold" style={{ background: "var(--color-ok)", color: "#08050f" }}>✓</span>
            <h1 className="t-card-title mt-5">{result === "already" ? "Already checked in" : "You're checked in!"}</h1>
            <p className="t-body mt-2 text-muted">{event!.title} · {EVENT_TYPE_LABEL[event!.type]}</p>
            <p className="mt-1 text-[13px] text-muted">{fmtDate(event!.startsAt)} · {eventTimeRange(event!)} · {event!.location}</p>
            <p className="t-body mt-5 text-muted">Signed in as {name}. It&apos;s on your Events page.</p>
          </>
        )}
        <Link href="/events" className="pill pill-blue mt-7 w-full justify-center">Go to Events</Link>
      </div>
    </section>
  );
}
