"use client";

import { useEffect, useRef } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS = [
  [
    { href: "/admin", label: "Overview", exact: true },
    { href: "/admin/opportunities", label: "Opportunities" },
    { href: "/admin/applications", label: "Applications" },
    { href: "/admin/events", label: "Events" },
    { href: "/admin/announcements", label: "Announcements" },
  ],
  [
    { href: "/admin/members", label: "Members" },
    { href: "/admin/teams", label: "Field teams" },
    { href: "/admin/resumes", label: "Resume book" },
    { href: "/admin/employers", label: "Employers" },
    { href: "/admin/activity", label: "Activity" },
    { href: "/admin/settings", label: "Settings" },
  ],
];

export default function ExecRail() {
  const pathname = usePathname();
  const isOn = (l: { href: string; exact?: boolean }) => (l.exact ? pathname === l.href : pathname.startsWith(l.href));
  const strip = useRef<HTMLElement>(null);

  // Phones: keep the current section's chip in view in the swipeable strip.
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>("[aria-current='page']");
    if (strip.current && el) strip.current.scrollLeft = el.offsetLeft - 20;
  }, [pathname]);

  return (
    <>
      {/* Desktop / tablet: sticky side rail */}
      <aside className="rail-desktop card flex flex-col gap-5 self-start" style={{ padding: 24, position: "sticky", top: 88 }}>
        <p className="t-eyebrow px-4">Exec workspace</p>
        {GROUPS.map((group, gi) => (
          <div key={gi} className="contents">
            {gi > 0 && <div className="hairline mx-4" />}
            <nav className="flex flex-col gap-1">
              {group.map((l) => (
                <Link key={l.href} href={l.href} className={`rail-item ${isOn(l) ? "rail-item-on" : ""}`} aria-current={isOn(l) ? "page" : undefined}>
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        ))}
      </aside>

      {/* Phones: one swipeable row of sections instead of a screen-tall menu */}
      <nav ref={strip} className="rail-strip" aria-label="Console sections">
        {GROUPS.flat().map((l) => (
          <Link key={l.href} href={l.href} className={`chip ${isOn(l) ? "chip-on" : ""}`} aria-current={isOn(l) ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
