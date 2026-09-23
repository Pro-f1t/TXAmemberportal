"use client";

import type { UserCredential } from "firebase/auth";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { signInWithGoogle, completeRedirectSignIn, signOutClient } from "@/lib/firebase/auth";

// In-app browsers (Instagram, TikTok, Snapchat, Facebook…) partition storage,
// which breaks Google/Firebase sign-in. Detect them so we can tell the user to
// open the page in Safari/Chrome instead.
function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly|BytedanceWebview|Snapchat|Pinterest|LinkedInApp|GSA\//i.test(ua);
}

function errorCode(e: unknown): string {
  return e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
}

function LoginForm() {
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inApp, setInApp] = useState(false);
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    setInApp(isInAppBrowser());
  }, []);

  // Exchange a Google credential for a server session cookie, then route on.
  const establishSession = useCallback(
    async (cred: UserCredential) => {
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const body = await res.json();
      if (!res.ok) {
        await signOutClient();
        setError(body.error || "Sign-in failed.");
        setLoading(false);
        return;
      }
      const staff = ["admin", "exec"].includes(body.role);
      const next = params.get("next");
      // Hard navigation (not router.push) so the just-set session cookie is sent
      // with the request — a client nav can race the cookie and bounce a brand-new
      // user back to sign-in until they refresh.
      window.location.assign(next || (staff ? "/admin" : "/"));
    },
    [params]
  );

  // If the browser blocked the popup we fell back to a redirect; finish it here
  // when the user comes back to this page.
  useEffect(() => {
    let active = true;
    completeRedirectSignIn()
      .then((cred) => {
        if (!active || !cred) return;
        setLoading(true);
        establishSession(cred);
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Sign-in failed.");
      });
    return () => {
      active = false;
    };
  }, [establishSession]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const cred = await signInWithGoogle();
      if (cred) {
        await establishSession(cred); // popup path
      }
      // null = popup was blocked and a redirect started; the page is navigating
      // away, so leave the loading state on.
    } catch (e) {
      const code = errorCode(e);
      setError(
        code === "auth/popup-closed-by-user"
          ? "The sign-in window was closed before finishing. Tap Continue with Google to try again."
          : e instanceof Error ? e.message : "Sign-in failed."
      );
      setLoading(false);
    }
  };

  return (
    <section className="shell flex min-h-svh items-center justify-center py-20">
      <div className="card w-full max-w-md p-8">
        <p className="t-eyebrow">Texas Accelerate</p>
        <h1 className="t-card-title mt-3">Sign in</h1>
        <p className="t-body mt-2 text-muted">
          Opportunities, events, and announcements for members.
        </p>

        {inApp && (
          <div
            className="mt-5 rounded-2xl p-4 text-[13px]"
            style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.35)" }}
          >
            <p className="font-semibold text-white">Open in your browser to sign in</p>
            <p className="mt-1 text-muted">
              You&apos;re in an in-app browser (Instagram/TikTok), where Google sign-in is blocked. Tap the{" "}
              <span className="text-white">{isIOS ? "••• menu at the top-right" : "⋮ menu at the top-right"}</span>{" "}
              and choose <span className="text-white">{isIOS ? "“Open in Safari”" : "“Open in Chrome” / “Open in browser”"}</span>, then sign in there.
            </p>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="pill pill-ghost mt-6 w-full justify-center disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Continue with Google"}
        </button>

        {error && (
          <p className="mt-4 text-[13px]" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        )}

        <p className="mt-6 text-[13px] text-muted">
          Sign in with the Google account exec has on file. New accounts wait for exec approval.
        </p>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <section className="shell flex min-h-svh items-center justify-center py-20">
          <div className="card w-full max-w-md p-8">
            <p className="t-eyebrow">Texas Accelerate</p>
            <h1 className="t-card-title mt-3">Sign in</h1>
            <p className="t-body mt-2 text-muted">Loading…</p>
          </div>
        </section>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
