/**
 * Volume seed: pile extra events, announcements, postings, and members on top
 * of `npm run seed` so the list pages can be judged at semester scale. Emulator
 * only. Idempotent (ids are prefixed `bulk-`). Run: `npm run seed:bulk`.
 */
import * as dotenv from "dotenv";
import admin from "firebase-admin";
dotenv.config();

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error("Refusing to run: emulator env vars must be set.");
  process.exit(1);
}
admin.initializeApp({ projectId: "demo-txa-portal" });
const db = admin.firestore();

const TEAMS = [
  "Business, Finance & Consulting", "Government, Law & Public Affairs", "Marketing & Communications",
  "Software, AI & Technology", "Engineering & Manufacturing", "Healthcare & Life Sciences",
];
const d = (s) => new Date(s);
const pick = (arr, i) => arr[i % arr.length];

// ---------- 24 events across Aug–Dec, mixed past/future/draft ----------
const EVENT_NAMES = [
  ["Fall Welcome Social", "social", "Union Patio"], ["Excel Bootcamp", "workshop", "CBA 4.330"], ["Case Prep Night", "profdev", "GDC 2.216"],
  ["Employer Panel: Consulting", "company", "CBA 3.202"], ["Coffee Chat: Software Team", "social", "Cabo Bob's"], ["Resume Review Drop-in", "profdev", "GDC Atrium"],
  ["Info Session: Spring Projects", "info", "PAI 2.48"], ["LinkedIn Headshot Day", "profdev", "CBA Plaza"], ["Intramural Kickball", "social", "Whitaker Fields"],
  ["Firefly Site Visit", "company", "Cedar Park"], ["Alumni Panel", "profdev", "CBA 3.202"], ["Halloween Social", "social", "Union Ballroom"],
  ["SQL Workshop", "workshop", "GDC 1.406"], ["Mock Case Interviews", "profdev", "CBA 4.348"], ["Coffee Chat: Healthcare Team", "social", "Medici"],
  ["Employer Panel: Government", "company", "PAI 2.48"], ["Photo Booth Night", "social", "Union Patio"], ["Final Readouts: Round 1", "profdev", "CBA 3.202"],
  ["Final Readouts: Round 2", "profdev", "CBA 3.202"], ["End of Semester Banquet", "social", "AT&T Center"], ["Spring Recruiting Prep", "info", "Virtual"],
  ["Exec Applications Q&A", "info", "GDC 2.216"], ["General Meeting: October", "gm", "CBA 4.330"], ["General Meeting: November", "gm", "CBA 4.330"],
];
const TIMES = ["5:00 PM", "6:00 PM", "6:30 PM", "7:00 PM"];
const eventDates = [
  "2026-08-20", "2026-08-25", "2026-08-31", "2026-09-06", "2026-09-07", "2026-09-09", "2026-09-14", "2026-09-16", "2026-09-20", "2026-09-23",
  "2026-09-30", "2026-10-08", "2026-10-13", "2026-10-20", "2026-10-22", "2026-10-27", "2026-10-30", "2026-11-05", "2026-11-12", "2026-11-19",
  "2026-12-02", "2026-12-04", "2026-10-06", "2026-11-03",
];
const memberUids = ["seed-maya", "seed-jordan", "seed-priya", "seed-sam", "seed-elena", "seed-noah", "seed-grace", "seed-omar", "seed-ava", "seed-exec"];
for (let i = 0; i < EVENT_NAMES.length; i++) {
  const [title, type, location] = EVENT_NAMES[i];
  const date = eventDates[i];
  const past = d(date) < d("2026-09-08");
  const rsvp = memberUids.filter((_, k) => (k + i) % 3 !== 0);
  await db.doc(`events/bulk-ev-${i}`).set({
    title, startsAt: d(`${date}T${["17", "18", "18", "19"][i % 4]}:${i % 4 === 2 ? "30" : "00"}:00-05:00`), timeLabel: pick(TIMES, i), location,
    capacity: i % 5 === 0 ? 40 : null, type, audienceTeams: i % 7 === 3 ? [pick(TEAMS, i)] : [], description: `${title}. Details to follow.`,
    countsForAttendance: type !== "social" || i % 2 === 0, status: i === 20 || i === 21 ? "draft" : "published",
    rsvpUids: rsvp, attendedUids: past ? rsvp.filter((_, k) => k % 4 !== 1) : [], excusedUids: [],
    createdAt: d("2026-08-10"), updatedAt: d("2026-08-10"),
  }, { merge: true });
}
console.log(`events +${EVENT_NAMES.length}`);

// ---------- 14 announcements ----------
const ANN = [
  ["Welcome to Fall 2026", "update", "2026-08-20"], ["Sign the member agreement by Friday", "action", "2026-08-22"], ["Excel bootcamp slides posted", "update", "2026-08-26"],
  ["Employer panel moved to CBA 3.202", "update", "2026-09-01"], ["Photo day: wear something plain", "update", "2026-09-03"], ["Submit your availability for readouts", "action", "2026-09-04"],
  ["Firefly site visit: RSVP cap is 25", "action", "2026-09-06"], ["Slack channels reorganised", "update", "2026-09-07"], ["Coffee chat hosts needed", "action", "2026-09-07"],
  ["New employer: Porsche", "update", "2026-09-08"], ["Timesheets due Sunday", "action", "2026-09-08"], ["Exec office hours this week", "update", "2026-09-08"],
  ["Retreat carpool sheet", "update", "2026-09-08"], ["Fall banquet date set", "update", "2026-09-08"],
];
for (let i = 0; i < ANN.length; i++) {
  const [title, label, date] = ANN[i];
  await db.doc(`announcements/bulk-ann-${i}`).set({
    title, body: `${title}. Check the events page or ask your team lead if anything is unclear.`, label, audienceTeams: i % 4 === 1 ? [pick(TEAMS, i)] : [],
    status: "live", publishAt: d(`${date}T09:00:00-05:00`), expiresAt: null, authorUid: "seed-exec", authorName: "Dev Shah", emailMembers: false,
    createdAt: d(`${date}T09:00:00-05:00`), updatedAt: d(`${date}T09:00:00-05:00`),
  }, { merge: true });
}
console.log(`announcements +${ANN.length}`);

// ---------- 18 postings ----------
const EMP = [["emp-daves", "Dave's Hot Chicken"], ["emp-santander", "Santander"], ["emp-firefly", "Firefly"], ["emp-txhouse", "Texas House of Representatives"], ["emp-wharton", "Wharton Lab"], ["emp-lockheed", "Lockheed Martin"], ["emp-porsche", "Porsche"], ["emp-lanier", "Lanier Law"]];
const TITLES = ["Data Analyst", "Campaign Coordinator", "Product Research Intern", "Operations Associate", "Content Strategist", "Policy Fellow", "QA Engineer", "Financial Modelling Analyst", "Community Outreach Lead", "UX Research Assistant", "Supply Chain Intern", "Clinical Data Coordinator", "Brand Designer", "Legislative Aide", "Growth Analyst", "Backend Engineer", "Events Coordinator", "Market Sizing Analyst"];
for (let i = 0; i < TITLES.length; i++) {
  const [employerId, employerName] = pick(EMP, i);
  const status = i % 6 === 5 ? "draft" : i % 6 === 4 ? "closed" : "live";
  const closes = `2026-${i % 2 ? "09" : "10"}-${String(10 + (i % 18)).padStart(2, "0")}T23:59:00-05:00`;
  await db.doc(`opportunities/bulk-opp-${i}`).set({
    title: TITLES[i], employerId, employerName, teams: [pick(TEAMS, i)], audienceTeams: [], commitment: `${5 + (i % 8)} hrs/wk · Fall 2026`,
    closesAt: status === "closed" ? d("2026-09-01T23:59:00-05:00") : i % 5 === 0 ? null : d(closes), status, publishAt: null, previewImageUrl: "",
    summary: `${employerName} needs a ${TITLES[i].toLowerCase()} for the fall.`, description: "Details in the summary. Reach out to exec with questions.",
    requiresTeamResume: true, createdBy: "seed-exec", createdByName: "Dev Shah", createdAt: d(`2026-08-${20 + (i % 9)}`), updatedAt: d(`2026-09-0${1 + (i % 7)}`),
    updatedByName: "Dev Shah", publishedAt: status === "live" ? d(`2026-08-${20 + (i % 9)}T10:00:00-05:00`) : null,
  }, { merge: true });
}
console.log(`opportunities +${TITLES.length}`);

// ---------- 30 members ----------
const FIRST = ["Aiden", "Bella", "Carlos", "Diya", "Ethan", "Fatima", "Gabe", "Hana", "Isaac", "Jules", "Kai", "Leila", "Mateo", "Nia", "Owen", "Pia", "Quinn", "Rohan", "Sofia", "Theo", "Uma", "Vikram", "Wren", "Ximena", "Yusuf", "Zara", "Amara", "Ben", "Chloe", "Dani"];
const LAST = ["Garcia", "Nguyen", "Okafor", "Patel", "Kim", "Rossi", "Müller", "Silva", "Chen", "Haddad"];
const MAJORS = ["Finance", "Computer Science", "Government", "Marketing", "Biology", "Mechanical Engineering", "Economics", "Public Health", "Advertising", "Accounting"];
const CLASS = ["Class of 2027", "Class of 2028", "Class of 2029", "Class of 2030"];
for (let i = 0; i < FIRST.length; i++) {
  const name = `${FIRST[i]} ${pick(LAST, i * 7)}`;
  const email = `${FIRST[i].toLowerCase()}.${pick(LAST, i * 7).toLowerCase().replace("ü", "u")}@utexas.edu`;
  const teams = [pick(TEAMS, i), ...(i % 3 === 0 ? [pick(TEAMS, i + 2)] : [])];
  const resumes = i % 5 === 4 ? [] : [{ id: `r-bulk-${i}`, fileName: `${pick(LAST, i * 7)}_Resume.pdf`, url: "https://example.com/resumes/bulk.pdf", size: 150_000 + i * 1000, uploadedAt: d("2026-08-25T12:00:00-05:00"), assignedTeams: i % 2 ? [teams[0]] : [], isDefault: true }];
  await db.doc(`members/bulk-m-${i}`).set({
    uid: `bulk-m-${i}`, email, name, firstName: FIRST[i], lastName: pick(LAST, i * 7), role: "member", status: i === 29 ? "inactive" : "active", teams,
    major: pick(MAJORS, i), gradDate: pick(CLASS, i), phone: "", eid: `${FIRST[i][0].toLowerCase()}${pick(LAST, i * 7)[0].toLowerCase()}${10000 + i * 137}`, linkedin: "", photoUrl: "",
    resumes, memberSince: d("2026-08-25"), createdAt: d("2026-08-25"),
  }, { merge: true });
}
console.log(`members +${FIRST.length}`);
console.log("Done.");
process.exit(0);
