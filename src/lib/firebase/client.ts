"use client";

import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { EMULATOR_PROJECT_ID } from "./emulator";

const useEmulator = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "1";

// PUBLIC browser config. Safe to commit — it is not a secret. Replace these
// placeholders with the real values from the TXA Firebase project's web app
// (Firebase console → Project settings → Your apps → Web app config) before
// deploying to production. In emulator mode the projectId is overridden below,
// so the placeholders are fine for all local development.
// Serve Firebase Auth from our OWN origin (proxied — see next.config.ts) so the
// login handler is first-party and Safari/iPad storage partitioning can't break
// it. On the client that's the current host; the string fallback only applies
// during SSR, where no auth call runs.
const authDomain =
  typeof window !== "undefined" ? window.location.host : "txa-portal.vercel.app";

export const firebaseConfig = {
  apiKey: "AIzaSyAbWsz1WepeH9hNBxq2lrYUjfWx-a3GKbg",
  authDomain,
  // Auth tokens carry the project id and the server verifies it, so the browser
  // must use the emulator project when the server does.
  projectId: useEmulator ? EMULATOR_PROJECT_ID : "txarecruiting",
  storageBucket: "txarecruiting.firebasestorage.app",
  messagingSenderId: "579979928284",
  appId: "1:579979928284:web:7404172e5f037f67a04a19",
  measurementId: "G-V59SXFKG59",
};

export const firebaseClientApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseClientApp);
export const db = getFirestore(firebaseClientApp);
export const storage = getStorage(firebaseClientApp);

// Local emulator suite. NEXT_PUBLIC_FIREBASE_EMULATOR=1 points the browser SDK
// at the emulators; the server-side FIRESTORE_EMULATOR_HOST must be set too, or
// the sign-in popup mints a token the server can't verify.
if (useEmulator) {
  connectAuthEmulator(auth, "http://127.0.0.1:9098", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8081);
  connectStorageEmulator(storage, "127.0.0.1", 9198);
}
