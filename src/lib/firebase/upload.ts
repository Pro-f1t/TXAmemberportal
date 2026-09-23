"use client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, auth } from "./client";

/** Upload a file to Storage and return its download URL. */
export async function uploadFile(folder: string, uid: string, file: File): Promise<string> {
  // Storage rules require the browser's Firebase Auth user (separate from the
  // app's server session). Make sure it's ready before we try to write.
  await auth.authStateReady?.();
  if (!auth.currentUser) {
    const err = new Error("You're signed out on this device. Please sign in again, then retry the upload.");
    (err as { code?: string }).code = "storage/unauthenticated";
    throw err;
  }

  const safe = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${folder}/${uid}/${Date.now()}-${safe}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type || undefined });
  return getDownloadURL(r);
}
