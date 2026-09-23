/**
 * Delete Firebase Auth accounts from the PRODUCTION project in bulk (the console
 * only deletes one at a time). Dry run by default: lists what would go.
 *
 *   # 1. dry run — prints every account and the total, deletes nothing
 *   GOOGLE_APPLICATION_CREDENTIALS=~/Downloads/txarecruiting-firebase-adminsdk-xxxx.json \
 *     node scripts/prod-delete-auth-users.mjs
 *
 *   # 2. the real thing — same command plus CONFIRM=DELETE
 *   CONFIRM=DELETE GOOGLE_APPLICATION_CREDENTIALS=... node scripts/prod-delete-auth-users.mjs
 *
 * KEEP=a@x.edu,b@x.edu spares those emails. Deleting an Auth account does NOT
 * touch Firestore or Storage. Delete the JSON key from Downloads when done.
 */
import admin from "firebase-admin";
import { readFileSync } from "fs";

// The .env in this folder points the Admin SDK at the emulators. dotenv is NOT
// loaded here on purpose, and any emulator vars already in the shell are
// stripped, so this can only ever talk to the project the credentials name.
for (const k of ["FIRESTORE_EMULATOR_HOST", "FIREBASE_AUTH_EMULATOR_HOST", "FIREBASE_STORAGE_EMULATOR_HOST"]) delete process.env[k];

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("Set GOOGLE_APPLICATION_CREDENTIALS to the service-account JSON path.");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });
const auth = admin.auth();
const projectId = JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8")).project_id;
const keep = new Set((process.env.KEEP || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean));
const confirm = process.env.CONFIRM === "DELETE";

console.log(`Project: ${projectId}`);
console.log(confirm ? "MODE: DELETE" : "MODE: dry run (set CONFIRM=DELETE to delete)");
if (keep.size) console.log(`Keeping: ${[...keep].join(", ")}`);

const targets = [];
let token;
do {
  const page = await auth.listUsers(1000, token);
  for (const u of page.users) {
    const email = (u.email || "").toLowerCase();
    const spare = keep.has(email);
    console.log(`${spare ? "keep  " : "delete"}  ${(email || "(no email)").padEnd(40)} ${u.uid}`);
    if (!spare) targets.push(u.uid);
  }
  token = page.pageToken;
} while (token);

console.log(`\n${targets.length} account(s) ${confirm ? "will be" : "would be"} deleted.`);
if (!confirm || targets.length === 0) process.exit(0);

let done = 0;
for (let i = 0; i < targets.length; i += 1000) {
  const res = await auth.deleteUsers(targets.slice(i, i + 1000));
  done += res.successCount;
  for (const e of res.errors) console.error(`failed ${targets[i + e.index]}: ${e.error.message}`);
}
console.log(`Deleted ${done}.`);
process.exit(0);
