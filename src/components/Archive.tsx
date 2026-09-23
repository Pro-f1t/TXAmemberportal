"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "./Icons";

/** "Archive" toggle under the Upcoming list: reveals past events in place. */
export default function Archive({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <div className="mt-5 flex flex-col">
      <div className="hairline mb-5" />
      <button type="button" onClick={() => setOpen((v) => !v)} className="pill pill-ghost pill-sm self-start" aria-expanded={open}>
        <span>Archive · {count}</span>
        <ChevronDown className="h-3.5 w-3.5 transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && <div className="mt-4 flex flex-col gap-3">{children}</div>}
    </div>
  );
}
