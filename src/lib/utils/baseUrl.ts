import { headers } from "next/headers";

/** Absolute origin of this deployment, for links that leave the browser. */
export async function getBaseUrl(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (env) return env.startsWith("http") ? env.replace(/\/$/, "") : `https://${env}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3001";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
