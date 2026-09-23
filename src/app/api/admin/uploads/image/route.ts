import { NextResponse } from "next/server";
import { requireStaff, guardErrorStatus } from "@/lib/auth/guard";
import { readUpload, safeFileName, uploadToStorage } from "@/lib/firebase/storage";

export const runtime = "nodejs";
// Vercel caps request bodies at 4.5 MB; editors downscale raster images first.
const MAX_BYTES = 4 * 1024 * 1024;

/** Console image upload (posting previews, employer logos): multipart `file` → Storage URL. */
export async function POST(request: Request) {
  try {
    const { member } = await requireStaff();
    const up = await readUpload(request, { maxBytes: MAX_BYTES, accept: /^image\/(png|jpe?g|webp|svg\+xml)$/, label: "Images" });
    const url = await uploadToStorage(`images/${member.uid}/${Date.now()}-${safeFileName(up.name)}`, up.buffer, up.type);
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    const status = guardErrorStatus(error);
    if (status) return NextResponse.json({ error: status === 403 ? "Staff only" : "Not signed in" }, { status });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 });
  }
}
