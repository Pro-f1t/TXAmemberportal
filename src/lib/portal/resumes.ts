import type { Resume } from "@/lib/models/Member";

/** Invariant: exactly one default when any resume exists. */
export function normaliseResumes(resumes: Resume[]): Resume[] {
  if (resumes.length && !resumes.some((r) => r.isDefault)) resumes[0].isDefault = true;
  let seen = false;
  for (const r of resumes) {
    if (r.isDefault && seen) r.isDefault = false;
    if (r.isDefault) seen = true;
  }
  return resumes;
}
