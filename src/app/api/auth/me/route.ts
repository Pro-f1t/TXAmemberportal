import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser, guardErrorStatus } from "@/lib/auth/guard";

export async function GET() {
  try {
    const { member } = await requireUser();
    // Only what the nav needs — never the full profile (resumes, phone…).
    const response = NextResponse.json({
      user: { uid: member.uid, name: member.name, firstName: member.firstName, email: member.email, role: member.role, status: member.status },
    });
    // The nav calls this on every page load, so use it to re-sync the
    // client-visible role cookie after a role change (promotion to exec).
    const jar = await cookies();
    const role = member.role.toLowerCase();
    if (jar.get("user_role")?.value !== role) {
      response.cookies.set({ name: "user_role", value: role, maxAge: 60 * 60 * 24 * 5, sameSite: "lax", httpOnly: false, secure: process.env.NODE_ENV === "production", path: "/" });
    }
    return response;
  } catch (error) {
    const status = guardErrorStatus(error) ?? 500;
    return NextResponse.json({ error: "Not signed in" }, { status });
  }
}
