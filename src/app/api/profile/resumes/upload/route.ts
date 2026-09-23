import { NextResponse } from "next/server";
import { requireUser, guardErrorStatus } from "@/lib/auth/guard";
import { setMemberResumes } from "@/lib/firebase/members";
import { MAX_RESUMES } from "@/lib/models/Member";
import { newId } from "@/lib/firebase/fs";
import { readUpload, safeFileName, uploadToStorage } from "@/lib/firebase/storage";
import { normaliseResumes } from "@/lib/portal/resumes";

export const runtime = "nodejs";
// Vercel caps request bodies at 4.5 MB.
const MAX_BYTES = 4 * 1024 * 1024;

/** Resume upload: multipart `file` (PDF) → Storage → appended to member.resumes. */
export async function POST(request: Request) {
  try {
    const { member } = await requireUser();
    if (member.resumes.length >= MAX_RESUMES) throw new Error(`You can keep up to ${MAX_RESUMES} resumes. Delete one first.`);
    const up = await readUpload(request, { maxBytes: MAX_BYTES, accept: /^application\/(pdf|x-pdf)$/, label: "Resumes" });
    if (!/\.pdf$/i.test(up.name)) throw new Error("Resumes must be PDFs.");
    const url = await uploadToStorage(`resumes/${member.uid}/${Date.now()}-${safeFileName(up.name)}`, up.buffer, "application/pdf");
    const resumes = normaliseResumes([
      ...member.resumes,
      { id: newId(), fileName: up.name, url, size: up.size, uploadedAt: new Date(), assignedTeams: [], isDefault: member.resumes.length === 0 },
    ]);
    await setMemberResumes(member.uid, resumes);
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    const status = guardErrorStatus(error);
    if (status) return NextResponse.json({ error: "Not signed in" }, { status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
