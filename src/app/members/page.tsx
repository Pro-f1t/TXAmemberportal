import { memberPage } from "@/lib/auth/page";
import { getAllMembers } from "@/lib/firebase/members";
import { portalConfig } from "@/lib/portal/memberData";
import { STAFF_ROLES, byRoleThenName } from "@/lib/models/Member";
import { PageHeader } from "@/components/ui";
import MemberDirectory from "@/components/MemberDirectory";

export const dynamic = "force-dynamic";

/** Member-facing directory: active members only, no private fields. */
export default async function MembersPage() {
  await memberPage("/members");
  const [config, members] = await Promise.all([portalConfig(), getAllMembers()]);
  const active = members.filter((m) => m.status === "active").sort(byRoleThenName);

  return (
    <section className="shell pb-16" style={{ paddingTop: 90 }}>
      <div className="flex flex-col gap-5">
        <PageHeader eyebrow={`${config.season} · ${active.length} members`} title="Members" />
        <MemberDirectory
          rows={active.map((m) => ({
            uid: m.uid, name: m.name, photoUrl: m.photoUrl, teams: m.teams,
            meta: [m.major, m.major2].filter(Boolean).join(" & "),
            role: STAFF_ROLES.includes(m.role) ? "Exec" : m.role === "lead" ? "Field team lead" : "",
          }))}
        />
      </div>
    </section>
  );
}
