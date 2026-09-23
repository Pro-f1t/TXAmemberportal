import { getAllMembers } from "@/lib/firebase/members";
import { getAllOpportunities } from "@/lib/firebase/portal";
import { isOpportunityLive, isPastDeadline } from "@/lib/models/Portal";
import { Team } from "@/lib/models/Member";
import { FIELD_TEAMS } from "@/data/fieldTeams";
import { PageHeader, Pill, PlaceholderArt } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminTeams() {
  const [members, opps] = await Promise.all([getAllMembers(), getAllOpportunities()]);
  const active = members.filter((m) => m.status === "active");
  const live = opps.filter((o) => isOpportunityLive(o) && !isPastDeadline(o) && o.status !== "closed");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Exec console · Field teams" title="Field teams" actions={<Pill href="/admin/members?invite=1" tone="blue">Add member to a team</Pill>} />
      <div className="grid items-stretch gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        {FIELD_TEAMS.map((ft) => {
          const team = ft.name as Team;
          const leads = active.filter((m) => m.role === "lead" && m.teams.includes(team));
          const count = active.filter((m) => m.teams.includes(team)).length;
          const postings = live.filter((o) => o.teams.includes(team)).length;
          return (
            <div key={team} className="card flex min-w-0 flex-col gap-3.5" style={{ padding: 26 }}>
              <PlaceholderArt seed={ft.seed} className="rounded-2xl" style={{ height: 72 }} label={team} />
              <p className="m-0 text-[20px] font-bold leading-[1.2]" style={{ letterSpacing: "-0.02em" }}>{team}</p>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between gap-3"><span className="text-[13px] text-muted">Lead</span><span className="text-[13px] font-semibold">{leads.length ? leads.map((l) => l.name).join(", ") : <span className="text-muted">Not set</span>}</span></div>
                <div className="flex justify-between gap-3"><span className="text-[13px] text-muted">Members</span><span className="text-[13px] font-semibold">{count}</span></div>
                <div className="flex justify-between gap-3"><span className="text-[13px] text-muted">Open postings</span><span className="text-[13px] font-semibold">{postings}</span></div>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <Pill size="xs" href={`/admin/members?team=${encodeURIComponent(team)}`}>Members</Pill>
                <Pill size="xs" href={`/admin/resumes?team=${encodeURIComponent(team)}`}>Resume book</Pill>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
