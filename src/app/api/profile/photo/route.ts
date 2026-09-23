import { NextResponse } from "next/server";
import { requireUser, guardErrorStatus } from "@/lib/auth/guard";
import { updateMember } from "@/lib/firebase/members";
import { readUpload, safeFileName, uploadToStorage } from "@/lib/firebase/storage";

export const runtime = "nodejs";
// Vercel caps request bodies at 4.5 MB; the client downscales photos well under that.
const MAX_BYTES = 4 * 1024 * 1024;

/** Headshot upload: multipart `file` (PNG/JPEG/WebP) → Storage → member.photoUrl. */
export async function POST(request: Request) {
  try {
    const { member } = await requireUser();
    const up = await readUpload(request, { maxBytes: MAX_BYTES, accept: /^image\/(png|jpe?g|webp)$/, label: "Photos" });
    const url = await uploadToStorage(`images/${member.uid}/${Date.now()}-${safeFileName(up.name)}`, up.buffer, up.type);
    await updateMember(member.uid, { photoUrl: url });
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    const status = guardErrorStatus(error);
    if (status) return NextResponse.json({ error: "Not signed in" }, { status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
