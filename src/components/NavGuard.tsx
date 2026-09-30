"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Makes navigation impossible to get stuck (Jamie: "nothing happens when I press
 * the nav and I have to refresh").
 *
 * In-app links normally fetch the next page in the background and swap it in.
 * If that fetch never finishes (a phone tab back from the background with dead
 * connections, a network blip, a stale deployment) the click looks like it did
 * nothing. So, for every internal link click:
 *   1. show a progress bar immediately, so the press visibly registers;
 *   2. if the tab has just come back from the background, skip the background
 *      fetch and do a normal full page load (the browser re-establishes
 *      connections properly for those);
 *   3. otherwise watch the navigation, and if the URL hasn't changed after
 *      STUCK_MS, finish it with a full page load.
 */
const STUCK_MS = 6000;
const AWAY_MS = 45_000;

function internalTarget(e: MouseEvent): URL | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const el = e.target as Element | null;
  const a = el?.closest?.("a[href]") as HTMLAnchorElement | null;
  if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return null;
  // A button (Delete, Reopen, RSVP…) sitting inside a clickable row is not a navigation.
  const control = el?.closest?.("button, input, select, textarea, label, summary, [role='button']");
  if (control && a.contains(control)) return null;
  let url: URL;
  try {
    url = new URL(a.href, window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return null;
  // Same page (or just a #hash on it): nothing to navigate.
  if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
  return url;
}

export default function NavGuard() {
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const stale = useRef(false);
  const timers = useRef<{ poll?: ReturnType<typeof setInterval>; stuck?: ReturnType<typeof setTimeout>; hide?: ReturnType<typeof setTimeout> }>({});

  useEffect(() => {
    const t = timers.current;
    let hiddenAt = 0;

    const finish = () => {
      clearInterval(t.poll);
      clearTimeout(t.stuck);
      setPhase("done");
      clearTimeout(t.hide);
      t.hide = setTimeout(() => setPhase("idle"), 350);
    };

    const onClick = (e: MouseEvent) => {
      const url = internalTarget(e);
      if (!url) return;
      const href = url.pathname + url.search + url.hash;
      setPhase("loading");

      if (stale.current) {
        // Back from the background: don't trust a background fetch. Full load.
        e.preventDefault();
        window.location.assign(href);
        return;
      }

      const from = window.location.pathname + window.location.search;
      clearInterval(t.poll);
      clearTimeout(t.stuck);
      clearTimeout(t.hide);
      t.poll = setInterval(() => {
        if (window.location.pathname + window.location.search !== from) finish();
      }, 120);
      // Decide once the click has finished dispatching. Next's <Link> cancels the
      // browser's own navigation when it takes over; only then is there an
      // in-page navigation that could hang and need rescuing. If nothing
      // cancelled it, the browser is already doing a normal page load.
      setTimeout(() => {
        if (!e.defaultPrevented) return;
        t.stuck = setTimeout(() => {
          clearInterval(t.poll);
          if (window.location.pathname + window.location.search === from) window.location.assign(href);
        }, STUCK_MS);
      }, 0);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > AWAY_MS) stale.current = true;
    };
    const markStale = () => { stale.current = true; };
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) stale.current = true; };

    // Capture phase on window: runs before the link's own click handler.
    window.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", markStale);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", markStale);
      window.removeEventListener("pageshow", onPageShow);
      clearInterval(t.poll);
      clearTimeout(t.stuck);
      clearTimeout(t.hide);
    };
  }, []);

  return <div className={`nav-progress nav-progress-${phase}`} aria-hidden />;
}
