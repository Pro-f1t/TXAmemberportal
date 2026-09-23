"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarIcon, ChevronLeft, ChevronRight, CloseIcon } from "./Icons";
import { centralDate, centralParts } from "@/lib/utils/time";
import { fmtDateYear, fmtTime } from "@/lib/utils/format";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MINUTES = ["00", "15", "30", "45"];

/**
 * Portal-styled date (and optional time) picker. Values are real Dates
 * interpreted in US Central; `null` = unset. Replaces the browser's native
 * popover, which ignores the theme.
 */
export default function DatePicker({
  value, onChange, withTime = false, placeholder = "Pick a date", defaultHour = 12, className = "", style,
}: {
  value: Date | null; onChange: (d: Date | null) => void; withTime?: boolean; placeholder?: string;
  /** Hour used when a date is picked on a date-only field (e.g. 23 for deadlines). */
  defaultHour?: number; className?: string; style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sel = value ? centralParts(value) : null;
  const today = centralParts(new Date());
  const [view, setView] = useState({ y: sel?.y ?? today.y, m: sel?.m ?? today.m });

  useEffect(() => {
    if (!open) return;
    setView({ y: sel?.y ?? today.y, m: sel?.m ?? today.m });
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const hour = sel?.h ?? defaultHour;
  const minute = sel?.min ?? 0;
  const pick = (y: number, m: number, d: number) => {
    onChange(centralDate(y, m, d, withTime ? hour : defaultHour, withTime ? minute : defaultHour === 23 ? 59 : 0));
    if (!withTime) setOpen(false);
  };
  const setTime = (h: number, min: number) => { if (sel) onChange(centralDate(sel.y, sel.m, sel.d, h, min)); };

  // Calendar grid: 6 rows from the Sunday on/before the 1st.
  const first = new Date(Date.UTC(view.y, view.m - 1, 1));
  const startOffset = first.getUTCDay();
  const cells = Array.from({ length: 42 }, (_, i) => {
    const dt = new Date(Date.UTC(view.y, view.m - 1, 1 - startOffset + i));
    return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), inMonth: dt.getUTCMonth() + 1 === view.m };
  });
  const monthLabel = new Date(Date.UTC(view.y, view.m - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const shift = (n: number) => setView((v) => { const m = v.m + n; return m < 1 ? { y: v.y - 1, m: 12 } : m > 12 ? { y: v.y + 1, m: 1 } : { y: v.y, m }; });
  const isSel = (c: { y: number; m: number; d: number }) => !!sel && sel.y === c.y && sel.m === c.m && sel.d === c.d;
  const isToday = (c: { y: number; m: number; d: number }) => today.y === c.y && today.m === c.m && today.d === c.d;
  const h12 = ((hour + 11) % 12) + 1;
  const pm = hour >= 12;

  return (
    <div ref={ref} className={`relative ${className}`} style={style}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="input flex items-center justify-between gap-3 text-left" aria-haspopup="dialog" aria-expanded={open}>
        <span className={value ? "" : "text-white/40"}>{value ? `${fmtDateYear(value)}${withTime ? ` · ${fmtTime(value)}` : ""}` : placeholder}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          {value && (
            <span role="button" aria-label="Clear date" onClick={(e) => { e.stopPropagation(); onChange(null); }} className="flex h-5 w-5 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/10 hover:text-white">
              <CloseIcon className="h-3 w-3" />
            </span>
          )}
          <CalendarIcon className="h-4 w-4 text-muted" />
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          className="animate-fade-slide-down absolute left-0 z-50 mt-2 rounded-[20px] p-4"
          style={{ width: 300, background: "var(--color-surface-2)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="m-0 text-[15px] font-semibold" style={{ letterSpacing: "-0.02em" }}>{monthLabel}</p>
            <div className="flex gap-1">
              <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent hover:text-ink"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => shift(1)} aria-label="Next month" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent hover:text-ink"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {WEEKDAYS.map((w, i) => <span key={i} className="py-1 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">{w}</span>)}
            {cells.map((c, i) => {
              const on = isSel(c);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(c.y, c.m, c.d)}
                  className="flex h-9 w-full items-center justify-center rounded-full text-[13px] font-semibold transition-colors"
                  style={{
                    color: on ? "var(--color-ink)" : c.inMonth ? "#fff" : "rgba(255,255,255,0.3)",
                    background: on ? "var(--color-accent)" : "transparent",
                    outline: !on && isToday(c) ? "1px solid rgba(96,165,250,0.6)" : "none",
                    outlineOffset: -1,
                  }}
                  onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}
                  aria-pressed={on}
                >
                  {c.d}
                </button>
              );
            })}
          </div>

          {withTime && (
            <div className="mt-3 flex items-center gap-2" style={{ opacity: sel ? 1 : 0.45 }}>
              <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">Time</span>
              <select className="select" style={{ width: 70, padding: "8px 28px 8px 12px", borderRadius: 10, backgroundPosition: "right 8px center" }} value={h12} disabled={!sel} onChange={(e) => setTime((Number(e.target.value) % 12) + (pm ? 12 : 0), minute)}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
              <select className="select" style={{ width: 70, padding: "8px 28px 8px 12px", borderRadius: 10, backgroundPosition: "right 8px center" }} value={String(minute).padStart(2, "0")} disabled={!sel} onChange={(e) => setTime(hour, Number(e.target.value))}>
                {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <select className="select" style={{ width: 76, padding: "8px 28px 8px 12px", borderRadius: 10, backgroundPosition: "right 8px center" }} value={pm ? "PM" : "AM"} disabled={!sel} onChange={(e) => setTime((hour % 12) + (e.target.value === "PM" ? 12 : 0), minute)}>
                <option>AM</option>
                <option>PM</option>
              </select>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={() => { onChange(null); setOpen(false); }} className="text-[13px] font-semibold text-muted transition-colors hover:text-white">Clear</button>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setView({ y: today.y, m: today.m }); pick(today.y, today.m, today.d); }} className="text-[13px] font-semibold text-accent transition-colors hover:text-white">Today</button>
              {withTime && <button type="button" onClick={() => setOpen(false)} className="pill pill-blue pill-xs">Done</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
