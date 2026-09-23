"use client";

/**
 * Browser-side upload helpers. Files go to our own API (multipart), which
 * writes them to Storage with the Admin SDK — so an upload only needs the
 * portal session, not the browser's separate Firebase Auth user.
 */
export async function uploadViaApi(endpoint: string, file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append("file", file, file.name);
  const res = await fetch(endpoint, { method: "POST", body: form, credentials: "same-origin" });
  let data: { ok?: boolean; url?: string; error?: string } = {};
  try {
    data = await res.json();
  } catch {
    // Non-JSON (e.g. a proxy 413) — fall through to the status-based message.
  }
  if (!res.ok) {
    if (res.status === 413) throw new Error("That file is too large to upload. Keep it under 4 MB.");
    if (res.status === 401 || res.status === 403) throw new Error("Your session has expired. Please sign in again, then retry.");
    throw new Error(data.error || `Upload failed (${res.status}).`);
  }
  return { url: data.url || "" };
}

/**
 * Downscale a headshot in the browser before upload: longest side ≤ `max` px,
 * re-encoded as JPEG. A 12 MB phone photo becomes ~200 KB. Falls back to the
 * original file if the browser can't decode it (it is then size-checked server-side).
 */
export async function shrinkImage(file: File, max = 1200, quality = 0.86): Promise<File> {
  if (typeof createImageBitmap !== "function") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    if (scale === 1 && file.size < 900 * 1024 && file.type !== "image/webp") { bmp.close(); return file; }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { bmp.close(); return file; }
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
