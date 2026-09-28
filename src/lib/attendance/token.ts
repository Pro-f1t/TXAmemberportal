import crypto from "crypto";

// Rotating check-in tokens (ported from the recruiting site, proven at events).
// Derived, not stored — any server instance can verify one:
//   bucket = floor(now / 10s)
//   token  = `${bucket}.${HMAC(secret, `${eventId}:${bucket}`)[0:16]}`
// Verification accepts the current bucket ±1, so a code is valid ~10–20s and a
// screenshot sent to a group chat is dead by the time anyone opens it.

const BUCKET_MS = 10_000;
const TOKEN_SIG_LEN = 16;
const PASS_SIG_LEN = 24;
const PASS_TTL_MS = 10 * 60 * 1000; // survives the Google sign-in detour

function secret(): string {
  return process.env.CHECKIN_SECRET || "";
}

export function checkinConfigured(): boolean {
  return !!secret();
}

function hmac(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function currentBucket(now = Date.now()): number {
  return Math.floor(now / BUCKET_MS);
}

function mintToken(eventId: string, bucket: number): string {
  return `${bucket}.${hmac(`${eventId}:${bucket}`).slice(0, TOKEN_SIG_LEN)}`;
}

/** 60 tokens (10 minutes) plus the server clock, so the display survives wifi drops and clock skew. */
export function mintTokenBatch(eventId: string, count = 60, now = Date.now()) {
  const b0 = currentBucket(now);
  return { now, bucketMs: BUCKET_MS, tokens: Array.from({ length: count }, (_, i) => mintToken(eventId, b0 + i)) };
}

export function verifyToken(eventId: string, token: string, now = Date.now()): boolean {
  if (!secret()) return false;
  const [bucketStr, sig] = String(token).split(".");
  const bucket = Number(bucketStr);
  if (!Number.isInteger(bucket) || !sig) return false;
  if (Math.abs(bucket - currentBucket(now)) > 1) return false;
  return safeEqual(sig, mintToken(eventId, bucket).split(".")[1]);
}

// A pass proves presence was verified inside the 10s window; it rides along in
// an httpOnly cookie through the login detour so the token doesn't have to.
export function mintPass(eventId: string, now = Date.now()): string {
  const exp = now + PASS_TTL_MS;
  return `${eventId}.${exp}.${hmac(`pass:${eventId}.${exp}`).slice(0, PASS_SIG_LEN)}`;
}

export function verifyPass(eventId: string, pass: string | undefined, now = Date.now()): boolean {
  if (!secret() || !pass) return false;
  const parts = String(pass).split(".");
  if (parts.length !== 3) return false;
  const [ev, expStr, sig] = parts;
  const exp = Number(expStr);
  if (ev !== eventId || !Number.isFinite(exp) || now > exp) return false;
  return safeEqual(sig, hmac(`pass:${ev}.${exp}`).slice(0, PASS_SIG_LEN));
}

export const PASS_COOKIE = "att_pass";
export const PASS_TTL_SECONDS = Math.floor(PASS_TTL_MS / 1000);

/** Gate for the projector laptop, which may not be signed in. */
export function displayKeyOk(k: string | null | undefined): boolean {
  const key = process.env.DISPLAY_KEY || "";
  return !!key && !!k && safeEqual(String(k), key);
}
