import { NextResponse } from "next/server";
import { requireStaff, guardErrorStatus } from "@/lib/auth/guard";
import { readUpload, safeFileName, uploadToStorage } from "@/lib/firebase/storage";

export const runtime = "nodejs";
// Vercel caps request bodies at 4.5 MB.
const MAX_BYTES = 4 * 1024 * 1024;

/** Console PDF upload (an employer's job description for a posting): multipart `file` → Storage URL. */
export async function POST(request: Request) {
  try {
    const { member } = await requireStaff();
    const up = await readUpload(request, { maxBytes: MAX_BYTES, accept: /^application\/(pdf|x-pdf)$/, label: "PDFs" });
    if (!/\.pdf$/i.test(up.name)) throw new Error("That file isn't a PDF.");
    const url = await uploadToStorage(`postings/${member.uid}/${Date.now()}-${safeFileName(up.name)}`, up.buffer, "application/pdf", { inline: safeFileName(up.name) });
    return NextResponse.json({ ok: true, url, name: up.name });
  } catch (error) {
    const status = guardErrorStatus(error);
    if (status) return NextResponse.json({ error: status === 403 ? "Staff only" : "Not signed in" }, { status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
