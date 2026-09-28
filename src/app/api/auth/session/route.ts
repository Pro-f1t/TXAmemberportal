import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { getMember, createMember, getInvite, deleteInvite, updateMember } from "@/lib/firebase/members";
import { getPortalConfig } from "@/lib/firebase/portal";
import { recordAudit } from "@/lib/firebase/audit";

// Any Google account may sign in. A brand-new account becomes a PENDING member
// (sees /pending until an exec activates them) — unless an exec pre-approved
// the email via an invite, in which case it's active immediately.
//
// Bootstrap: emails listed in PORTAL_ADMIN_EMAILS (comma-separated) become an
// active exec the first time they sign in, so a fresh deployment has someone
// who can open the console and add everyone else.

export async function POST(request: Request) {
  let idToken: string | undefined;
  try {
    ({ idToken } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!idToken) return NextResponse.json({ error: "ID token is required." }, { status: 400 });

  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const record = await adminAuth.getUser(decoded.uid);
    const existing = await getMember(decoded.uid);

    let role = "member";
    let status = "pending";
    const { requireApproval } = await getPortalConfig();
    if (existing) {
      role = existing.role;
      status = existing.status;
      // Open sign-up (approval off): anyone still pending is let in on their next sign-in.
      // Inactive accounts stay inactive — that was an exec decision.
      if (status === "pending" && !requireApproval) {
        await updateMember(existing.uid, { status: "active" });
        await recordAudit({ actorUid: existing.uid, actorName: existing.name, action: "member.status", target: existing.uid, detail: `${existing.name}: pending → active (open sign-up)` });
        status = "active";
      }
    } else {
      const email = (record.email || "").toLowerCase();
      const invite = email ? await getInvite(email) : null;
      const bootstrap = (process.env.PORTAL_ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean).includes(email);
      const name = record.displayName || invite?.name || "NA";
      await createMember({
        uid: record.uid,
        email: email || "NA",
        name,
        role: bootstrap ? "exec" : invite?.role ?? "member",
        status: bootstrap || invite || !requireApproval ? "active" : "pending",
        teams: invite?.teams ?? [],
        photoUrl: "", // never the Google avatar — members upload a real headshot (initials until then)
        memberSince: new Date(),
        createdAt: new Date(),
      });
      if (!requireApproval && !bootstrap && !invite) {
        status = "active";
        await recordAudit({ actorUid: record.uid, actorName: name, action: "member.join", target: record.uid, detail: `${name} joined via open sign-up` });
      }
      if (bootstrap) {
        role = "exec";
        status = "active";
      }
      if (invite) {
        await deleteInvite(email);
        role = bootstrap ? "exec" : invite.role;
        status = "active";
      }
    }

    const response = NextResponse.json({ status: "success", role, memberStatus: status }, { status: 200 });
    response.cookies.set({
      name: "session",
      value: sessionCookie,
      maxAge: Math.floor(expiresIn / 1000),
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    response.cookies.set({
      name: "user_role",
      value: role.toLowerCase(),
      maxAge: Math.floor(expiresIn / 1000),
      sameSite: "lax",
      httpOnly: false, // read by the proxy + Nav
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Unauthorized request." }, { status: 401 });
  }
}
