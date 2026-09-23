# TXA Member Portal

The member portal for Texas Accelerate: members see announcements, browse and
apply to opportunities posted by exec, track applications, RSVP to events, and
manage their profile and resumes. Exec gets a console to post opportunities,
events, and announcements, and to manage members, field teams, the resume book,
and employers.

Built from the Claude Design handoff (`design_handoff_txa_member_portal`) on the
same stack and design language as the recruiting portal (Project03).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Firebase
(Google auth on the client, Admin SDK + Firestore + Storage on the server).

## Getting started

```bash
npm install
npm run emulators   # Firebase emulators (needs JDK 21+ on PATH — see below; ports 8081/9098/9198/4001 so it can run beside Project03's suite)
npm run seed        # members, employers, postings, events, announcements
npm run seed:bulk   # optional: +22 events, +14 announcements, +18 postings, +30 members for scale testing
npm run dev         # http://localhost:3001
```

`.env` (already present) points everything at the local emulators. Nothing here
touches production.

**JDK:** firebase-tools 15 needs Java 21+. If `java -version` says 11, download
Corretto 21 and export `JAVA_HOME`/`PATH` before `npm run emulators`.

**Signing in locally:** the emulator's Google popup lets you pick any seeded
`@utexas.edu` email. `dev.shah@utexas.edu` is an exec, `jamie@utexas.edu` an
admin, `maya.patel@utexas.edu` the member with the fullest data,
`new.member@utexas.edu` a pending account.

## Routes

| Member | |
|---|---|
| `/` | Home: hero + stats, announcements, upcoming events, current projects |
| `/opportunities` | Open postings for the member's teams (`?sort=deadline`) |
| `/opportunities/[id]` | Posting + apply with a chosen resume |
| `/applications` | In progress / next step / decided (`?tab=past`) |
| `/events` | Upcoming grouped by month with RSVP, attendance progress, past |
| `/announcements` | Every live announcement: pinned, then by month |
| `/members`, `/members/[uid]` | Directory and member profiles (teams, contact, RSVPs, projects — no resumes) |
| `/profile` | Editable profile, resumes (max 5, team assignment, default), projects |
| `/pending` | Shown to signed-in accounts exec hasn't activated |

| Exec console (`/admin`, staff only) | |
|---|---|
| `/admin` | Overview |
| `/admin/opportunities`, `/admin/opportunities/[id]`, `…/[id]/applicants` | List, Notion-style editor (`new` creates), applicant pipeline |
| `/admin/applications` | Every application, filterable by stage and posting; move statuses and read answers |
| `/admin/events`, `/admin/events/[id]/attendance` | List + editor, attendance roster |
| `/admin/announcements` | List + editor |
| `/admin/members`, `/admin/members/[uid]` | Roster with search/filters, invites, member detail |
| `/admin/teams` | Field team cards |
| `/admin/resumes` | Resume book with the team-resolution rule |
| `/admin/employers` | Partners + editor |
| `/admin/settings` | Season, week, events required, Google Calendar link |

## Data model

Firestore collections (all access is server-side through the Admin SDK; the
client SDK only does Google auth and Storage uploads):

- `members/{uid}` — profile, `role` (member · lead · exec · admin), `status`
  (active · pending · inactive), `teams[]`, `resumes[]` (each with
  `assignedTeams[]`, one `isDefault`).
- `invites/{email}` — exec pre-approval; consumed on first sign-in.
- `opportunities`, `applications` (`{uid}__{opportunityId}`), `events`
  (`rsvpUids`, `attendedUids`, `excusedUids` arrays), `announcements`,
  `employers`, `audit_log`, `config/portal`.

Visibility: postings, events, and announcements carry `audienceTeams`; empty
means everyone. A resume shown to an employer for a team is the one assigned to
that team, else the member's default.

## Deploying

Same recipe as Project03: Vercel with `FIREBASE_SERVICE_ACCOUNT_B64`,
`FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_SITE_URL`, and `PORTAL_ADMIN_EMAILS` (your
Google email, so your first sign-in lands you in the console as exec). Publish `storage.rules` from
the Firebase console. See the workspace `LEARNINGS.md` for the gotchas.
