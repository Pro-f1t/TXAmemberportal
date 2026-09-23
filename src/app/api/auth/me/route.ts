import { NextResponse } from "next/server";
import { requireUser, guardErrorStatus } from "@/lib/auth/guard";

export async function GET() {
  try {
    const { member } = await requireUser();
    // Only what the nav needs — never the full profile (resumes, phone…).
    return NextResponse.json({
      user: { uid: member.uid, name: member.name, firstName: member.firstName, email: member.email, role: member.role, status: member.status },
    });
  } catch (error) {
    const status = guardErrorStatus(error) ?? 500;
    return NextResponse.json({ error: "Not signed in" }, { status });
  }
}
