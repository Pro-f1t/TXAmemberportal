import { getStorage } from "firebase-admin/storage";
import { randomUUID } from "crypto";
import "./admin"; // ensures the admin app is initialised
import { EMULATOR_PROJECT_ID } from "./emulator";

/**
 * Server-side uploads. Files reach Storage through the Admin SDK, so uploads
 * only need the portal session cookie — never the browser's own Firebase Auth
 * user (which Safari drops after a week away) and never the Storage rules.
 * Every object gets a download token, and token URLs bypass rules, so the
 * rules can stay deny-all.
 */
const emulatorHost = process.env.FIREBASE_STORAGE_EMULATOR_HOST;
const BUCKET = emulatorHost
  ? `${EMULATOR_PROJECT_ID}.appspot.com`
  : process.env.FIREBASE_STORAGE_BUCKET || "txarecruiting.firebasestorage.app";

export function safeFileName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(-120) || "file";
}

export async function uploadToStorage(path: string, data: Buffer, contentType: string, opts: { inline?: string } = {}): Promise<string> {
  const token = randomUUID();
  const file = getStorage().bucket(BUCKET).file(path);
  await file.save(data, {
    contentType,
    resumable: false,
    // `inline` = open in the browser (PDF viewer) under this file name, rather than download.
    metadata: { ...(opts.inline ? { contentDisposition: `inline; filename="${opts.inline.replace(/["\\\r\n]/g, "")}"` } : {}), metadata: { firebaseStorageDownloadTokens: token } },
  });
  const base = emulatorHost ? `http://${emulatorHost}` : "https://firebasestorage.googleapis.com";
  return `${base}/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/** Pull the single `file` field out of a multipart request, with size + type checks. */
export async function readUpload(request: Request, opts: { maxBytes: number; accept: RegExp; label: string }): Promise<{ buffer: Buffer; name: string; type: string; size: number }> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new Error("Upload didn't arrive as a file. Please try again.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("No file selected.");
  if (file.size === 0) throw new Error("That file is empty.");
  if (file.size > opts.maxBytes) throw new Error(`${opts.label} must be under ${Math.round(opts.maxBytes / 1024 / 1024)} MB.`);
  const type = file.type || "application/octet-stream";
  if (!opts.accept.test(type)) throw new Error(`${opts.label}: unsupported file type (${type}).`);
  return { buffer: Buffer.from(await file.arrayBuffer()), name: file.name, type, size: file.size };
}
