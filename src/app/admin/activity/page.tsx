import { staffPage } from "@/lib/auth/page";
import { getConsoleActivity } from "@/lib/firebase/audit";
import { describe } from "@/lib/portal/activity";
import { PageHeader } from "@/components/ui";
import ActivityLog from "@/components/ActivityLog";

export const dynamic = "force-dynamic";

/** Who did what in the console. Member-side actions (applying, sign-ups) are left out. */
export default async function ActivityPage() {
  await staffPage();
  const rows = await getConsoleActivity();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Exec console · Activity" title="Activity" />
      <ActivityLog
        rows={rows.map((r) => {
          const { area, verb } = describe(r.action);
          return { id: r.id, at: r.at.toISOString(), actorUid: r.actorUid, actorName: r.actorName, area, verb, detail: r.detail };
        })}
      />
    </div>
  );
}
