"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "./Icons";
import { Badge, DateBlock, Tone } from "./ui";

/**
 * A member-facing event row. When the event has a description, clicking the
 * row expands it; the action slot (RSVP) stays independent of the toggle.
 */
export default function EventRow({
  date, title, meta, description, badges, action,
}: {
  date: Date; title: string; meta: string; description: string; badges: { label: string; tone: Tone }[]; action?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const expandable = description.trim().length > 0;
  const toggle = () => { if (expandable) setOpen((v) => !v); };

  return (
    <div className="row row-lg" style={{ cursor: expandable ? "pointer" : "default" }} onClick={toggle} role={expandable ? "button" : undefined} aria-expanded={expandable ? open : undefined}>
      <div className="grid items-center gap-5" style={{ gridTemplateColumns: "56px minmax(0,1fr) auto" }}>
        <DateBlock date={date} size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="m-0 text-[17px] font-semibold" style={{ letterSpacing: "-0.02em" }}>{title}</p>
            {badges.map((b) => <Badge key={b.label} tone={b.tone}>{b.label}</Badge>)}
          </div>
          <p className="m-0 mt-1.5 text-[13px] text-muted">{meta}</p>
        </div>
        <div className="flex items-center gap-3">
          {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
          {expandable && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted" style={{ background: "rgba(255,255,255,0.06)" }} aria-hidden>
              <ChevronDown className="h-3.5 w-3.5 transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }} />
            </span>
          )}
        </div>
      </div>
      {open && (
        <p className="m-0 mt-3 text-[15px] leading-[1.55] text-muted" style={{ paddingLeft: 76 }}>{description}</p>
      )}
    </div>
  );
}
