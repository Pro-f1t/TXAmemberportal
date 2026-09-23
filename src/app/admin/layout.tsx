import { staffPage } from "@/lib/auth/page";
import ExecRail from "@/components/ExecRail";

/** The exec console: 260px sticky rail + content. Guarded by requireStaff. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await staffPage();
  return (
    <section className="shell pb-16" style={{ paddingTop: 82 }}>
      <div className="grid items-stretch gap-6" style={{ gridTemplateColumns: "260px minmax(0, 1fr)" }}>
        <ExecRail />
        <div className="flex min-w-0 flex-col">{children}</div>
      </div>
      <style>{`@media (max-width: 899px) { .shell > .grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}
