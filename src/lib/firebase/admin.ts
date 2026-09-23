import firebase from "firebase-admin";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import { EMULATOR_PROJECT_ID } from "./emulator";

if (!firebase.apps.length) {
  const firestoreEmulator = process.env.FIRESTORE_EMULATOR_HOST;
  const authEmulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;

  if (firestoreEmulator || authEmulator) {
    // Both emulator variables must be set together — with only one, the other
    // service silently talks to production.
    if (!firestoreEmulator || !authEmulator) {
      throw new Error(
        "Set FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST together (or neither)"
      );
    }
    if (process.env.VERCEL) {
      throw new Error("Firebase emulator variables are set in a Vercel environment — remove them");
    }
    console.warn(`Firebase admin using emulators (firestore ${firestoreEmulator}, auth ${authEmulator})`);
    firebase.initializeApp({ projectId: EMULATOR_PROJECT_ID });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    // Preferred for hosted deploys: the whole service-account JSON, base64-encoded
    // into one line. Immune to the newline mangling that breaks a pasted PEM key.
    const json = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, "base64").toString("utf8"));
    firebase.initializeApp({ credential: firebase.credential.cert(json) });
  } else if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    firebase.initializeApp({
      credential: firebase.credential.cert({
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Accept the key with real newlines, "\n" escapes, and/or surrounding quotes.
        privateKey: process.env.FIREBASE_PRIVATE_KEY
          .trim()
          .replace(/^["']|["']$/g, "")
          .replace(/\\n/g, "\n"),
        projectId: process.env.FIREBASE_PROJECT_ID,
      }),
    });
  } else if (process.env.NEXT_PHASE === "phase-production-build") {
    console.warn("Firebase admin credentials missing; using build-only stub project");
    firebase.initializeApp({ projectId: "demo-txa-portal" });
  } else {
    throw new Error(
      "Missing Firebase admin credentials (FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY)"
    );
  }
}

const adminDb: Firestore = getFirestore();
const adminAuth: Auth = getAuth();

export { adminDb, adminAuth };
