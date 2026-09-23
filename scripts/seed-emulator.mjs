/**
 * Seed the local emulator with a click-through-able portal: one admin, one
 * exec, ten members (matching the design prototype), employers, postings,
 * events, announcements, and applications. Emulator only — refuses to run
 * without the emulator env vars. Idempotent (set with merge).
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
const auth = admin.auth();

const T = {
  BUSINESS: "Business, Finance & Consulting",
  GOVERNMENT: "Government, Law & Public Affairs",
  MARKETING: "Marketing & Communications",
  SOFTWARE: "Software, AI & Technology",
  ENGINEERING: "Engineering & Manufacturing",
  HEALTHCARE: "Healthcare & Life Sciences",
};
const d = (s) => new Date(s);
// Deadlines relative to the run date so the demo never goes stale.
const inDays = (n, h = 23, m = 59) => { const x = new Date(); x.setDate(x.getDate() + n); x.setHours(h, m, 0, 0); return x.toISOString(); };
const resume = (id, fileName, size, uploadedAt, assignedTeams = [], isDefault = false) => ({
  id, fileName, url: `https://example.com/resumes/${fileName}`, size, uploadedAt: d(uploadedAt), assignedTeams, isDefault,
});

// ---------- members ----------
const MEMBERS = [
  { uid: "seed-admin", email: "jamie@utexas.edu", name: "Jamie Hao", role: "admin", status: "active", teams: [T.BUSINESS], major: "Biomedical Engineering", gradDate: "Class of 2027", eid: "jh12345", memberSince: "2025-08-20" },
  { uid: "seed-exec", email: "dev.shah@utexas.edu", name: "Dev Shah", role: "exec", status: "active", teams: [T.BUSINESS], major: "Finance", gradDate: "Class of 2027", eid: "ds44210", memberSince: "2025-08-20",
    resumes: [resume("r-dev-1", "Shah_Resume.pdf", 201_000, "2026-08-20T12:00:00-05:00", [], true)] },
  { uid: "seed-maya", email: "maya.patel@utexas.edu", name: "Maya Patel", role: "member", status: "active", teams: [T.BUSINESS, T.MARKETING], major: "Finance", gradDate: "Class of 2028", eid: "mp42837", phone: "(512) 555-0148", linkedin: "linkedin.com/in/mayapatel", memberSince: "2025-08-25",
    resumes: [
      resume("r-maya-1", "Patel_Finance_2026.pdf", 214_000, "2026-08-28T12:00:00-05:00", [T.BUSINESS]),
      resume("r-maya-2", "Patel_Marketing_2026.pdf", 198_000, "2026-09-01T12:00:00-05:00", [T.MARKETING]),
      resume("r-maya-3", "Patel_General.pdf", 187_000, "2026-08-12T12:00:00-05:00", [], true),
    ] },
  { uid: "seed-jordan", email: "jordan.lee@utexas.edu", name: "Jordan Lee", role: "lead", status: "active", teams: [T.SOFTWARE], major: "Computer Science", gradDate: "Class of 2027", eid: "jl20981", memberSince: "2025-08-25",
    resumes: [resume("r-jordan-1", "Lee_SWE.pdf", 176_000, "2026-08-30T12:00:00-05:00", [T.SOFTWARE], true)] },
  { uid: "seed-priya", email: "priya.nair@utexas.edu", name: "Priya Nair", role: "lead", status: "active", teams: [T.GOVERNMENT], major: "Government", gradDate: "Class of 2028", eid: "pn55120", memberSince: "2025-08-25",
    resumes: [resume("r-priya-1", "Nair_Policy.pdf", 190_000, "2026-08-22T12:00:00-05:00", [], true)] },
  { uid: "seed-sam", email: "sam.okafor@utexas.edu", name: "Sam Okafor", role: "lead", status: "active", teams: [T.ENGINEERING], major: "Mechanical Engineering", gradDate: "Class of 2027", eid: "so31877", memberSince: "2025-08-25", resumes: [] },
  { uid: "seed-elena", email: "elena.ruiz@utexas.edu", name: "Elena Ruiz", role: "lead", status: "active", teams: [T.HEALTHCARE], major: "Biology", gradDate: "Class of 2029", eid: "er90211", memberSince: "2026-01-15",
    resumes: [resume("r-elena-1", "Ruiz_Resume.pdf", 205_000, "2026-09-03T12:00:00-05:00", [T.HEALTHCARE], true)] },
  { uid: "seed-ava", email: "ava.chen@utexas.edu", name: "Ava Chen", role: "lead", status: "active", teams: [T.MARKETING], major: "Advertising", gradDate: "Class of 2027", eid: "ac77302", memberSince: "2025-08-25",
    resumes: [resume("r-ava-1", "Chen_Marketing.pdf", 180_000, "2026-08-27T12:00:00-05:00", [T.MARKETING], true)] },
  { uid: "seed-noah", email: "noah.kim@utexas.edu", name: "Noah Kim", role: "member", status: "active", teams: [T.BUSINESS], major: "Management", gradDate: "Class of 2028", eid: "nk10422", memberSince: "2026-01-15",
    resumes: [resume("r-noah-1", "Kim_Consulting.pdf", 211_000, "2026-09-02T12:00:00-05:00", [T.BUSINESS], true)] },
  { uid: "seed-grace", email: "grace.liu@utexas.edu", name: "Grace Liu", role: "member", status: "active", teams: [T.BUSINESS], major: "Accounting", gradDate: "Class of 2029", eid: "gl66214", memberSince: "2026-08-25", resumes: [] },
  { uid: "seed-omar", email: "omar.haddad@utexas.edu", name: "Omar Haddad", role: "member", status: "active", teams: [T.BUSINESS, T.SOFTWARE], major: "Business Analytics", gradDate: "Class of 2028", eid: "oh39001", memberSince: "2026-01-15",
    resumes: [resume("r-omar-1", "Haddad_Finance.pdf", 196_000, "2026-08-31T12:00:00-05:00", [T.BUSINESS], true)] },
  { uid: "seed-pending", email: "new.member@utexas.edu", name: "Taylor Nguyen", role: "member", status: "pending", teams: [], major: "", gradDate: "", eid: "", memberSince: "2026-09-07", resumes: [] },
];

for (const m of MEMBERS) {
  await auth.importUsers([{
    uid: m.uid, email: m.email, emailVerified: true, displayName: m.name,
    providerData: [{ uid: m.email, email: m.email, displayName: m.name, providerId: "google.com" }],
  }]).catch(() => {});
  const [firstName, ...rest] = m.name.split(" ");
  await db.doc(`members/${m.uid}`).set({
    uid: m.uid, email: m.email, name: m.name, firstName, lastName: rest.join(" "),
    role: m.role, status: m.status, teams: m.teams, major: m.major ?? "", gradDate: m.gradDate ?? "",
    phone: m.phone ?? "", eid: m.eid ?? "", linkedin: m.linkedin ?? "", photoUrl: "",
    resumes: m.resumes ?? [], memberSince: d(m.memberSince), createdAt: d(m.memberSince),
  }, { merge: true });
  console.log(`member  ${m.email.padEnd(28)} ${m.role.padEnd(6)} ${m.status}`);
}

// ---------- employers ----------
const EMPLOYERS = [
  { id: "emp-daves", name: "Dave's Hot Chicken", contact: "Alex Moreno", email: "alex@daveshotchicken.com", location: "Austin, TX", website: "daveshotchicken.com", teams: [T.MARKETING, T.BUSINESS] },
  { id: "emp-santander", name: "Santander", contact: "R. Alvarez", email: "r.alvarez@santander.com", location: "Austin, TX", website: "santander.com", teams: [T.BUSINESS] },
  { id: "emp-firefly", name: "Firefly", contact: "J. Park", email: "jpark@fireflyspace.com", location: "Cedar Park, TX", website: "fireflyspace.com", teams: [T.SOFTWARE] },
  { id: "emp-txhouse", name: "Texas House of Representatives", contact: "", email: "", location: "Austin, TX", website: "house.texas.gov", teams: [T.GOVERNMENT] },
  { id: "emp-wharton", name: "Wharton Lab", contact: "Dr. Wharton", email: "lab@utexas.edu", location: "Austin, TX", website: "", teams: [T.HEALTHCARE] },
  { id: "emp-lockheed", name: "Lockheed Martin", contact: "", email: "", location: "Fort Worth, TX", website: "lockheedmartin.com", teams: [T.ENGINEERING] },
  { id: "emp-porsche", name: "Porsche", contact: "", email: "", location: "Austin, TX", website: "porsche.com", teams: [T.ENGINEERING] },
  { id: "emp-lanier", name: "Lanier Law", contact: "", email: "", location: "Houston, TX", website: "lanierlawfirm.com", teams: [T.MARKETING, T.GOVERNMENT] },
];
for (const e of EMPLOYERS) {
  await db.doc(`employers/${e.id}`).set({ ...e, logoUrl: "", status: "active", createdAt: d("2026-08-01"), updatedAt: d("2026-08-01") }, { merge: true });
}
console.log(`employers ${EMPLOYERS.length}`);

// ---------- opportunities ----------
const byEmp = Object.fromEntries(EMPLOYERS.map((e) => [e.id, e.name]));
const OPPS = [
  { id: "opp-growth", title: "Growth Marketing Project", employerId: "emp-daves", teams: [T.MARKETING, T.BUSINESS], commitment: "10 hrs/wk · Fall 2026", questions: [{ id: "q-growth-1", label: "Link to a campaign or account you've run", type: "short", required: false }, { id: "q-growth-2", label: "Why this project, and what would you do in week one?", type: "long", required: true }], closesAt: inDays(7), status: "live", publishedAt: inDays(-6, 10, 0),
    summary: "Dave's Hot Chicken wants a small team to run paid social for two new Austin locations.",
    description: "You will own the paid social calendar, draft creative briefs for the store openings, and report weekly on spend and reach. Expect one working session a week with the marketing lead and one Friday readout.\n\nUseful: Meta Ads Manager, basic spreadsheet modelling, and writing that sounds like a person. No prior agency experience needed." },
  { id: "opp-insights", title: "Consumer Insights Analyst", employerId: "emp-santander", teams: [T.BUSINESS], commitment: "8 hrs/wk · Fall 2026", closesAt: inDays(10), status: "live", publishedAt: inDays(-5, 10, 0),
    summary: "Santander's Austin team needs survey analysis and a readout deck by November.",
    description: "Clean and analyse a 2,000-response customer survey, build the segment cuts the team asks for, and present a readout deck to the regional lead in November.\n\nUseful: Excel or Sheets, one of R/Python/SQL, and comfort presenting to adults." },
  { id: "opp-frontend", title: "Frontend Engineer, Internal Tools", employerId: "emp-firefly", teams: [T.SOFTWARE], commitment: "12 hrs/wk · Fall 2026", questions: [{ id: "q-fe-1", label: "GitHub or portfolio link", type: "short", required: true }, { id: "q-fe-2", label: "Describe something you shipped that people used", type: "long", required: true }], closesAt: inDays(2), status: "live", publishedAt: inDays(-7, 10, 0),
    summary: "Firefly is rebuilding an internal scheduling tool. React and TypeScript.",
    description: "Ship features on an internal scheduling app used by the launch operations team. You'll pair with a staff engineer, own small tickets end to end, and demo every other Friday.\n\nUseful: React, TypeScript, and a project you shipped that people actually used." },
  { id: "opp-policy", title: "Policy Research Assistant", employerId: "emp-txhouse", teams: [T.GOVERNMENT], commitment: "6 hrs/wk · Rolling", closesAt: null, status: "live", publishedAt: inDays(-4, 10, 0),
    summary: "Legislative research and constituent memos for a Texas House office.",
    description: "Research bills as they move through committee, draft one-page memos for the chief of staff, and help answer constituent mail on policy questions.\n\nUseful: clear writing, curiosity about how the Legislature works, and discretion." },
  { id: "opp-ux", title: "UX Research Assistant", employerId: "emp-firefly", teams: [T.SOFTWARE, T.MARKETING], commitment: "6 hrs/wk · Fall 2026", closesAt: inDays(12), status: "live", publishedAt: inDays(-3, 10, 0),
    summary: "Run five user interviews a week on Firefly's launch-ops tooling and turn them into one-page findings.",
    description: "You will recruit internal users, run short interviews, and write findings the engineers act on the same week.\n\nUseful: curiosity, note-taking, and a portfolio of anything you've written." },
  { id: "opp-model", title: "Financial Modelling Analyst", employerId: "emp-lanier", teams: [T.BUSINESS], commitment: "8 hrs/wk · Fall 2026", closesAt: inDays(16), status: "live", publishedAt: inDays(-2, 10, 0),
    summary: "Build the case-intake model the firm uses to decide which matters to take on.",
    description: "Turn a partner's spreadsheet into a maintained model with clear inputs and a one-page summary tab.\n\nUseful: Excel, some accounting, and patience with messy data." },
  { id: "opp-campaign", title: "Campaign Coordinator", employerId: "emp-txhouse", teams: [T.GOVERNMENT, T.MARKETING], commitment: "5 hrs/wk · Fall 2026", closesAt: inDays(5), status: "live", publishedAt: inDays(-8, 10, 0),
    summary: "Coordinate a district town-hall series: venues, outreach, and follow-up.",
    description: "Own the logistics for four town halls, draft outreach emails, and track RSVPs.\n\nUseful: organisation and writing that sounds like a person." },
  { id: "opp-supply-analyst", title: "Supply Chain Intern", employerId: "emp-lockheed", teams: [T.ENGINEERING], commitment: "10 hrs/wk · Fall 2026", closesAt: inDays(20), status: "live", publishedAt: inDays(-1, 10, 0),
    summary: "Map inbound parts flow for one assembly line and propose two fixes.",
    description: "Shadow the line, document the flow, and present two changes with estimated savings.\n\nUseful: any process-mapping experience and a willingness to ask questions." },
  { id: "opp-clinical-data", title: "Clinical Data Coordinator", employerId: "emp-wharton", teams: [T.HEALTHCARE], commitment: "6 hrs/wk · Fall 2026", closesAt: inDays(9), status: "live", publishedAt: inDays(-2, 15, 0),
    summary: "Keep a UT clinical study's participant data clean and IRB-compliant.",
    description: "Reconcile intake forms against the study database weekly and flag gaps to the coordinator.\n\nUseful: attention to detail; REDCap experience is a plus, not required." },
  { id: "opp-brand-design", title: "Brand Designer", employerId: "emp-daves", teams: [T.MARKETING], commitment: "8 hrs/wk · Fall 2026", closesAt: inDays(14), status: "live", publishedAt: inDays(-5, 12, 0),
    summary: "Design the in-store and social assets for two Austin openings.",
    description: "Work from the brand kit to produce menus, signage, and a social launch set.\n\nUseful: Figma or Illustrator and a portfolio link." },
  { id: "opp-backend", title: "Backend Engineer", employerId: "emp-firefly", teams: [T.SOFTWARE], commitment: "12 hrs/wk · Fall 2026", closesAt: inDays(18), status: "live", publishedAt: inDays(-4, 12, 0),
    summary: "Add a scheduling API to an internal tool. Node and Postgres.",
    description: "Design and ship two endpoints with tests, paired with a staff engineer.\n\nUseful: any backend project you've shipped." },
  { id: "opp-market", title: "Market Sizing Analyst", employerId: "emp-santander", teams: [T.BUSINESS], commitment: "6 hrs/wk · Fall 2026", closesAt: null, status: "live", publishedAt: inDays(-9, 10, 0),
    summary: "Size three Austin small-business segments for a lending pilot.",
    description: "Pull public data, build a bottom-up estimate, and present it to the regional team.\n\nUseful: spreadsheets and a clear head for assumptions." },
  { id: "opp-events", title: "Events Coordinator", employerId: "emp-porsche", teams: [T.MARKETING, T.BUSINESS], commitment: "5 hrs/wk · Fall 2026", closesAt: inDays(24), status: "live", publishedAt: inDays(-1, 9, 0),
    summary: "Help run two owner events at the Austin experience centre.",
    description: "Guest lists, vendor coordination, and day-of support.\n\nUseful: any event experience and a driver's licence." },
  { id: "opp-policy-fellow", title: "Policy Fellow", employerId: "emp-txhouse", teams: [T.GOVERNMENT], commitment: "8 hrs/wk · Fall 2026", closesAt: inDays(11), status: "live", publishedAt: inDays(-3, 9, 0),
    summary: "Research and draft two bill analyses for the interim.",
    description: "Read the bill, the fiscal note, and the stakeholders, then write the memo the office actually uses.\n\nUseful: clear writing and interest in the Legislature." },
  { id: "opp-clinical", title: "Clinical Outreach Coordinator", employerId: "emp-wharton", teams: [T.HEALTHCARE], commitment: "5 hrs/wk · Fall 2026", closesAt: null, status: "draft", publishedAt: null,
    summary: "Coordinate participant outreach for a UT clinical study.", description: "Draft in progress." },
  { id: "opp-supply", title: "Supply Chain Analyst", employerId: "emp-porsche", teams: [T.ENGINEERING], commitment: "8 hrs/wk · Fall 2026", closesAt: inDays(28), status: "scheduled", publishAt: inDays(14, 9, 0), publishedAt: null,
    summary: "Map inbound parts flow for the Austin experience centre.", description: "Posts Sep 22." },
  { id: "opp-mfg", title: "Manufacturing Ops Analyst", employerId: "emp-lockheed", teams: [T.ENGINEERING], commitment: "10 hrs/wk · Summer 2026", closesAt: "2026-09-01T23:59:00-05:00", status: "closed", publishedAt: "2026-08-10T10:00:00-05:00",
    summary: "Line efficiency study.", description: "Closed." },
  { id: "opp-brand", title: "Brand Refresh", employerId: "emp-lanier", teams: [T.MARKETING], commitment: "6 hrs/wk · Spring 2026", closesAt: "2026-02-01T23:59:00-06:00", status: "closed", publishedAt: "2026-01-15T10:00:00-06:00",
    summary: "Refresh the firm's brand system.", description: "Shipped Apr 28." },
];
for (const o of OPPS) {
  await db.doc(`opportunities/${o.id}`).set({
    title: o.title, employerId: o.employerId, employerName: byEmp[o.employerId], teams: o.teams, audienceTeams: [], commitment: o.commitment,
    closesAt: o.closesAt ? d(o.closesAt) : null, status: o.status, publishAt: o.publishAt ? d(o.publishAt) : null, previewImageUrl: "",
    summary: o.summary, description: o.description, requiresTeamResume: true, pinned: o.id === "opp-growth", questions: o.questions ?? [],
    createdBy: "seed-exec", createdByName: "Dev Shah", createdAt: d(o.publishedAt ?? "2026-09-06T10:00:00-05:00"),
    updatedAt: d("2026-09-08T14:30:00-05:00"), updatedByName: "Dev Shah", publishedAt: o.publishedAt ? d(o.publishedAt) : null,
  }, { merge: true });
}
console.log(`opportunities ${OPPS.length}`);

// ---------- events ----------
const EVENTS = [
  { id: "ev-kickoff", title: "Fall Kickoff", startsAt: "2026-08-28T18:00:00-05:00", timeLabel: "6:00 PM", location: "Union Ballroom", type: "social", counts: true,
    rsvp: ["seed-maya", "seed-jordan", "seed-priya", "seed-sam", "seed-elena", "seed-noah", "seed-omar", "seed-ava", "seed-exec"], attended: ["seed-maya", "seed-jordan", "seed-sam", "seed-elena", "seed-noah", "seed-omar", "seed-ava", "seed-exec"] },
  { id: "ev-linkedin", title: "LinkedIn Photo Hour", startsAt: "2026-09-02T16:00:00-05:00", timeLabel: "4:00 PM", location: "CBA Plaza", type: "profdev", counts: true,
    rsvp: ["seed-maya", "seed-jordan", "seed-exec"], attended: ["seed-jordan", "seed-exec", "seed-priya"] },
  { id: "ev-mixer", title: "Field Team Mixer", startsAt: "2026-09-04T18:30:00-05:00", timeLabel: "6:30 PM", location: "GDC Atrium", type: "social", counts: true,
    rsvp: ["seed-maya", "seed-jordan", "seed-sam", "seed-elena", "seed-omar"], attended: ["seed-maya", "seed-jordan", "seed-sam", "seed-elena", "seed-omar", "seed-exec", "seed-ava"] },
  { id: "ev-pwc", title: "Resume Workshop with PwC", startsAt: "2026-09-11T18:00:00-05:00", timeLabel: "6:00 PM", location: "CBA 4.348", type: "company", counts: true, capacity: 60,
    description: "Bring a printed resume. PwC recruiters review in small groups.", rsvp: ["seed-maya", "seed-jordan", "seed-noah", "seed-grace", "seed-omar"] },
  { id: "ev-case", title: "Consulting Case Night", startsAt: "2026-09-18T19:00:00-05:00", timeLabel: "7:00 PM", location: "GDC 2.216", type: "profdev", counts: true, capacity: 40,
    description: "Work a live case in teams of three with two PwC associates. Signup closes Friday; bring a laptop.", rsvp: ["seed-noah", "seed-omar"] },
  { id: "ev-mock", title: "Mock Interview Day", startsAt: "2026-09-25T17:00:00-05:00", timeLabel: "5:00 PM", location: "CBA 3.202", type: "profdev", counts: true,
    description: "Sign up in pairs.", rsvp: [] },
  { id: "ev-retreat", title: "Fall Retreat", startsAt: "2026-10-04T09:00:00-05:00", timeLabel: "All day", location: "Zilker", type: "social", counts: true,
    description: "Same location as last year, one week later. Counts toward the semester requirement.", rsvp: ["seed-jordan", "seed-elena", "seed-ava"] },
  { id: "ev-panel", title: "Employer Panel: Startups", startsAt: "2026-10-16T18:30:00-05:00", timeLabel: "6:30 PM", location: "TBD", type: "workshop", counts: false, status: "draft", rsvp: [] },
];
for (const e of EVENTS) {
  await db.doc(`events/${e.id}`).set({
    title: e.title, startsAt: d(e.startsAt), timeLabel: e.timeLabel, location: e.location, capacity: e.capacity ?? null, type: e.type,
    audienceTeams: [], description: e.description ?? "", countsForAttendance: e.counts, pinned: e.id === "ev-retreat", status: e.status ?? "published",
    rsvpUids: e.rsvp ?? [], attendedUids: e.attended ?? [], excusedUids: [], createdAt: d("2026-08-15"), updatedAt: d("2026-09-01"),
  }, { merge: true });
}
console.log(`events ${EVENTS.length}`);

// ---------- announcements ----------
const ANNS = [
  { id: "ann-postings", title: "Four new postings are live", body: "Dave's Hot Chicken, Santander, Firefly, and a Texas House office. Marketing and Software close first — read the JDs before Friday.", label: "pinned", audienceTeams: [], status: "live", publishAt: "2026-09-08T09:00:00-05:00", expiresAt: "2026-09-22T23:59:00-05:00" },
  { id: "ann-resumes", title: "Assign a resume to each of your teams", body: "Employers see the resume attached to the team they posted under. Two of your teams still use the default.", label: "action", audienceTeams: [T.MARKETING], status: "live", publishAt: "2026-09-05T09:00:00-05:00", expiresAt: null, authorName: "Marketing & Comms" },
  { id: "ann-retreat", title: "Fall retreat moved to Oct 4", body: "Same location, one week later. Attendance counts toward the semester requirement.", label: "update", audienceTeams: [], status: "live", publishAt: "2026-09-02T09:00:00-05:00", expiresAt: null },
  { id: "ann-leads", title: "Field team leads announced", body: "Meet your leads at the mixer on Sep 4.", label: "update", audienceTeams: [], status: "live", publishAt: "2026-08-29T09:00:00-05:00", expiresAt: "2026-09-05T23:59:00-05:00" },
  { id: "ann-case", title: "Case night signups close Friday", body: "Spots are capped at 40. RSVP on the events page.", label: "action", audienceTeams: [T.BUSINESS], status: "scheduled", publishAt: "2026-09-15T09:00:00-05:00", expiresAt: null },
];
for (const a of ANNS) {
  await db.doc(`announcements/${a.id}`).set({
    title: a.title, body: a.body, label: a.label, audienceTeams: a.audienceTeams, status: a.status,
    publishAt: a.publishAt ? d(a.publishAt) : null, expiresAt: a.expiresAt ? d(a.expiresAt) : null,
    authorUid: "seed-exec", authorName: a.authorName ?? "Dev Shah", emailMembers: false, createdAt: d(a.publishAt), updatedAt: d(a.publishAt),
  }, { merge: true });
}
console.log(`announcements ${ANNS.length}`);

// ---------- applications ----------
const app = (uid, name, oppId, team, resumeId, resumeFileName, status, submittedAt, extra = {}) => ({
  id: `${uid}__${oppId}`, data: {
    userId: uid, userName: name, opportunityId: oppId, opportunityTitle: OPPS.find((o) => o.id === oppId).title, employerName: byEmp[OPPS.find((o) => o.id === oppId).employerId],
    team, resumeId, resumeFileName, status, submittedAt: d(submittedAt), updatedAt: d(submittedAt), decidedAt: null, nextStep: "", nextStepAt: null, joinLink: "", answers: [], ...extra,
  },
});
const APPS = [
  app("seed-maya", "Maya Patel", "opp-growth", T.MARKETING, "r-maya-2", "Patel_Marketing_2026.pdf", "under_review", "2026-09-03T15:00:00-05:00", { nextStep: "Submitted Sep 3 · Decision by Sep 20", answers: [{ id: "q-growth-1", label: "Link to a campaign or account you've run", value: "instagram.com/utexasfinance" }, { id: "q-growth-2", label: "Why this project, and what would you do in week one?", value: "I ran paid social for a student org last spring and doubled signups on a $300 budget. Week one I'd audit the current ad account, set up conversion tracking for both store pages, and ship two creative variants to test." }] }),
  app("seed-maya", "Maya Patel", "opp-frontend", T.SOFTWARE, "r-maya-3", "Patel_General.pdf", "interview", "2026-09-02T11:00:00-05:00", { nextStep: "30 minutes with the internal tools lead. Bring one project you shipped.", nextStepAt: d("2026-09-12T15:00:00-05:00"), joinLink: "https://zoom.us/j/123456789" }),
  app("seed-maya", "Maya Patel", "opp-policy", T.GOVERNMENT, "r-maya-3", "Patel_General.pdf", "submitted", "2026-09-06T09:30:00-05:00"),
  app("seed-maya", "Maya Patel", "opp-insights", T.BUSINESS, "r-maya-1", "Patel_Finance_2026.pdf", "placed", "2026-08-20T09:00:00-05:00", { decidedAt: d("2026-08-30T12:00:00-05:00"), nextStep: "Readout due Nov 7 · 8 hrs/wk" }),
  app("seed-maya", "Maya Patel", "opp-brand", T.MARKETING, "r-maya-3", "Patel_General.pdf", "complete", "2026-01-20T09:00:00-06:00", { decidedAt: d("2026-04-28T12:00:00-05:00") }),
  app("seed-jordan", "Jordan Lee", "opp-frontend", T.SOFTWARE, "r-jordan-1", "Lee_SWE.pdf", "under_review", "2026-09-04T10:00:00-05:00"),
  app("seed-omar", "Omar Haddad", "opp-frontend", T.SOFTWARE, "r-omar-1", "Haddad_Finance.pdf", "submitted", "2026-09-05T10:00:00-05:00"),
  app("seed-omar", "Omar Haddad", "opp-insights", T.BUSINESS, "r-omar-1", "Haddad_Finance.pdf", "under_review", "2026-09-05T10:30:00-05:00"),
  app("seed-noah", "Noah Kim", "opp-insights", T.BUSINESS, "r-noah-1", "Kim_Consulting.pdf", "offer", "2026-09-03T10:00:00-05:00", { nextStep: "Offer sent Sep 7. Accept by Sep 12." }),
  app("seed-noah", "Noah Kim", "opp-growth", T.MARKETING, "r-noah-1", "Kim_Consulting.pdf", "submitted", "2026-09-06T10:00:00-05:00"),
  app("seed-priya", "Priya Nair", "opp-policy", T.GOVERNMENT, "r-priya-1", "Nair_Policy.pdf", "interview", "2026-09-05T10:00:00-05:00", { nextStep: "Phone screen with the chief of staff.", nextStepAt: d("2026-09-14T10:00:00-05:00") }),
  app("seed-ava", "Ava Chen", "opp-growth", T.MARKETING, "r-ava-1", "Chen_Marketing.pdf", "under_review", "2026-09-04T10:00:00-05:00"),
  app("seed-elena", "Elena Ruiz", "opp-mfg", T.ENGINEERING, "r-elena-1", "Ruiz_Resume.pdf", "declined", "2026-08-20T10:00:00-05:00", { decidedAt: d("2026-09-01T12:00:00-05:00") }),
];
for (const a of APPS) await db.doc(`applications/${a.id}`).set(a.data, { merge: true });
console.log(`applications ${APPS.length}`);

await db.doc("config/portal").set({ season: "Fall 2026", week: 3, requiredEvents: 4, calendarUrl: "" }, { merge: true });
console.log("config/portal set");
console.log("\nDone. Sign in at /auth/login and pick a seeded @utexas.edu email in the emulator popup.");
process.exit(0);
