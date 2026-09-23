import { getPortalConfig } from "@/lib/firebase/portal";
import { getBaseUrl } from "@/lib/utils/baseUrl";
import { PageHeader } from "@/components/ui";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  const [config, base] = await Promise.all([getPortalConfig(), getBaseUrl()]);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Exec console · Settings" title="Settings" />
      <SettingsForm config={config} feedUrl={`${base}/api/events/calendar.ics`} />
    </div>
  );
}
