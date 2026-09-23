"use client";

import { useState, type ReactNode } from "react";

/**
 * Collapses a long list: renders the first `initial` items, then a ghost pill
 * that reveals the rest. Server components pass already-rendered rows in.
 */
export default function ShowMore({
  items, initial = 8, label = "more", className = "", style,
}: {
  items: ReactNode[]; initial?: number; label?: string; className?: string; style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const hidden = items.length - initial;
  const shown = open || hidden <= 0 ? items : items.slice(0, initial);
  return (
    <>
      <div className={className} style={style}>{shown}</div>
      {hidden > 0 && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="pill pill-ghost pill-xs mt-3 self-start" aria-expanded={open}>
          {open ? "Show fewer" : `Show ${hidden} ${label}`}
        </button>
      )}
    </>
  );
}
