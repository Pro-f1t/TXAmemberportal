import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  type UserCredential,
} from "firebase/auth";
import { auth } from "./client";

// When the popup can't open, fall back to a full-page redirect. This is safe
// now that Firebase Auth is served from our own origin (see next.config.ts):
// the redirect round-trip no longer depends on cross-site storage.
const REDIRECT_FALLBACK_CODES = new Set([
  "auth/popup-blocked",
  "auth/operation-not-supported-in-this-environment",
  "auth/cancelled-popup-request",
]);

function googleProvider() {
  const provider = new GoogleAuthProvider();
  // Always show the account chooser so a wrong account can switch, instead of
  // Google silently reusing the last-used one.
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

/**
 * Start Google sign-in. Popup first; if the browser blocks it, redirect instead.
 * Returns the credential on the popup path, or null when a redirect was started
 * (the result is then picked up by completeRedirectSignIn on page load).
 */
export async function signInWithGoogle(): Promise<UserCredential | null> {
  const provider = googleProvider();
  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code?: string }).code) : "";
    if (REDIRECT_FALLBACK_CODES.has(code)) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

/** Resolve a pending redirect sign-in after the browser returns to the app. */
export async function completeRedirectSignIn(): Promise<UserCredential | null> {
  return getRedirectResult(auth);
}

export async function signOutClient() {
  return auth.signOut();
}
