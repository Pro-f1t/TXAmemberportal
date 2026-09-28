// Turns raw audit actions ("opportunity.live", "attendance.attended") into an
// area + a plain-English verb for the console Activity page.

export const AREAS = ["Opportunities", "Applications", "Events", "Attendance", "Announcements", "Employers", "Members", "Settings", "Exports"] as const;
export type Area = (typeof AREAS)[number];

const AREA_OF: Record<string, Area> = {
  opportunity: "Opportunities", application: "Applications", event: "Events", attendance: "Attendance",
  announcement: "Announcements", employer: "Employers", member: "Members", config: "Settings", export: "Exports",
};

const VERB: Record<string, string> = {
  "opportunity.create": "created a posting",
  "opportunity.update": "edited a posting",
  "opportunity.live": "published a posting",
  "opportunity.draft": "moved a posting to draft",
  "opportunity.scheduled": "scheduled a posting",
  "opportunity.closed": "archived a posting",
  "application.nextstep": "updated an applicant's next step",
  "event.create": "created an event",
  "event.update": "edited an event",
  "event.published": "published an event",
  "event.draft": "unpublished an event",
  "attendance.attended": "marked attended",
  "attendance.excused": "marked excused",
  "attendance.unattended": "cleared attendance",
  "attendance.backup.arm": "armed the backup check-in code",
  "attendance.backup.disarm": "disarmed the backup check-in code",
  "announcement.live": "posted an announcement",
  "announcement.draft": "saved an announcement draft",
  "announcement.scheduled": "scheduled an announcement",
  "announcement.update": "edited an announcement",
  "employer.create": "added an employer",
  "employer.update": "edited an employer",
  "member.role": "changed a role",
  "member.status": "changed membership",
  "member.update": "edited a profile",
  "member.invite": "invited a member",
  "member.uninvite": "removed an invite",
  "config.update": "changed settings",
  "export.members": "exported the member roster",
  "export.resumes": "exported the resume book",
  "export.events": "exported event attendance",
};

export function describe(action: string): { area: Area | "Other"; verb: string } {
  const area = AREA_OF[action.split(".")[0]] ?? "Other";
  if (VERB[action]) return { area, verb: VERB[action] };
  if (action.startsWith("application.status.")) return { area, verb: `moved an application to ${action.slice(19).replace(/_/g, " ")}` };
  return { area, verb: action.replace(/[._]/g, " ") };
}
