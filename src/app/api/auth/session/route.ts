import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { getMember, createMember, getInvite, deleteInvite } from "@/lib/firebase/members";

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
    if (existing) {
      role = existing.role;
      status = existing.status;
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
        status: bootstrap || invite ? "active" : "pending",
        teams: invite?.teams ?? [],
        photoUrl: record.photoURL || "",
        memberSince: new Date(),
        createdAt: new Date(),
      });
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
