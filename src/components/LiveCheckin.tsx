"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

type Batch = { startBucket: number; bucketMs: number; tokens: string[]; offset: number };

const COUNT_POLL_MS = 20_000;

/**
 * Full-screen rotating QR. Tokens come in 10-minute batches and rotate locally
 * off the server clock (offset-corrected), so a wifi blip doesn't freeze the
 * code. The QR is always dark-on-white — phones won't scan it on the dark theme.
 */
export default function LiveCheckin({ eventId, eventTitle, eventMeta, displayKey, base }: { eventId: string; eventTitle: string; eventMeta: string; displayKey: string; base: string }) {
  const [dataUrl, setDataUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [count, setCount] = useState<number | null>(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const batch = useRef<Batch | null>(null);
  const q = `eventId=${encodeURIComponent(eventId)}${displayKey ? `&k=${encodeURIComponent(displayKey)}` : ""}`;

  async function loadBatch() {
    try {
      const r = await fetch(`/api/attendance/tokens?${q}`, { cache: "no-store" });
      if (!r.ok) { setError((await r.json().catch(() => ({}))).error ?? `Couldn't load codes (${r.status}).`); return; }
      const { now, bucketMs, tokens } = await r.json();
      batch.current = { startBucket: Math.floor(now / bucketMs), bucketMs, tokens, offset: now - Date.now() };
      setStale(false);
      setError(null);
    } catch {
      /* keep rotating through the batch we already have */
    }
  }

  useEffect(() => {
    loadBatch();
    let timer: ReturnType<typeof setTimeout>;
    let lastToken = "";
    let refilling = false;
    const tick = async () => {
      const b = batch.current;
      if (b) {
        const serverNow = Date.now() + b.offset;
        const idx = Math.floor(serverNow / b.bucketMs) - b.startBucket;
        if (idx >= b.tokens.length - 12 && !refilling) { refilling = true; loadBatch().finally(() => (refilling = false)); }
        if (idx >= b.tokens.length) setStale(true);
        const tok = b.tokens[Math.max(0, Math.min(idx, b.tokens.length - 1))];
        if (tok && tok !== lastToken) {
          lastToken = tok;
          try {
            setDataUrl(await QRCode.toDataURL(`${base}/c/${encodeURIComponent(eventId)}/${tok}`, { margin: 4, width: 900, errorCorrectionLevel: "M", color: { dark: "#08050f", light: "#ffffff" } }));
          } catch { /* ignore */ }
        }
        setProgress((serverNow % b.bucketMs) / b.bucketMs);
      }
      timer = setTimeout(tick, 200);
    };
    tick();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch(`/api/attendance/count?${q}`, { cache: "no-store" });
        if (r.ok) { const { count } = await r.json(); if (alive) setCount(count); }
      } catch { /* ignore */ }
    };
    poll();
    const iv = setInterval(poll, COUNT_POLL_MS);
    return () => { alive = false; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  return (
    <section className="flex min-h-svh flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      <div>
        <p className="text-[15px] font-semibold uppercase tracking-[0.2em] text-muted">Scan to check in</p>
        <h1 className="mt-2 font-bold leading-tight" style={{ fontSize: "clamp(28px, 5vw, 52px)", letterSpacing: "-0.02em" }}>{eventTitle}</h1>
        <p className="mt-1 text-[15px] text-muted">{eventMeta}</p>
      </div>

      <div>
        <div className="rounded-[28px] bg-white p-6" style={{ width: "min(68vh, 88vw)", height: "min(68vh, 88vw)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {dataUrl ? <img src={dataUrl} alt="Check-in QR code" className="h-full w-full" /> : <div className="h-full w-full" />}
        </div>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.12)" }}>
          <div className="h-full rounded-full" style={{ width: `${Math.round((1 - progress) * 100)}%`, background: "var(--color-accent)", transition: "width 200ms linear" }} />
        </div>
        {stale && !error && <p className="mt-3 text-[13px]" style={{ color: "var(--color-warn)" }}>Reconnecting…</p>}
        {error && <p className="mt-3 text-[13px]" style={{ color: "var(--color-danger)" }}>{error}</p>}
      </div>

      <p className="m-0 text-[15px] text-muted">
        {count === null ? "…" : <><span className="text-[26px] font-bold text-white">{count}</span> checked in</>}
      </p>
      <p className="m-0 text-[13px] text-muted">Sign in with the Google account you use for the portal. No phone? Tell an exec.</p>
    </section>
  );
}
