import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight } from "./Icons";
import { monthShort, dayNum } from "@/lib/utils/format";

/**
 * Stand-in art for photography — on-brand gradient blocks. Same four gradients
 * as the marketing site so the field-team cards match one-to-one.
 */
export function PlaceholderArt({ seed = 0, className = "", label, style }: { seed?: number; className?: string; label?: string; style?: CSSProperties }) {
  const gradients = [
    "linear-gradient(135deg,#60a5fa 0%,#1e3a8a 55%,#0b1020 100%)",
    "linear-gradient(140deg,#1e3a8a 0%,#60a5fa 60%,#c7ddff 100%)",
    "linear-gradient(120deg,#0b1020 0%,#3b82f6 50%,#60a5fa 100%)",
    "linear-gradient(160deg,#60a5fa 0%,#0b1020 100%)",
  ];
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: gradients[seed % gradients.length], ...style }} role="img" aria-label={label ?? "Placeholder image"}>
      <div
        className="absolute inset-0 opacity-30"
        style={{ backgroundImage: "radial-gradient(circle at 30% 25%, rgba(255,255,255,.5), transparent 45%), radial-gradient(circle at 75% 80%, rgba(255,255,255,.28), transparent 40%)" }}
      />
    </div>
  );
}

/** Uploaded image with a PlaceholderArt fallback. */
export function ArtImage({ src, seed = 0, alt = "", className = "", style }: { src?: string | null; seed?: number; alt?: string; className?: string; style?: CSSProperties }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={`block object-cover ${className}`} style={style} />;
  }
  return <PlaceholderArt seed={seed} className={className} label={alt} style={style} />;
}

export function Card({ children, className = "", style, pad = 28 }: { children: ReactNode; className?: string; style?: CSSProperties; pad?: number }) {
  return (
    <div className={`card min-w-0 ${className}`} style={{ padding: pad, ...style }}>
      {children}
    </div>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`t-eyebrow ${className}`}>{children}</p>;
}

/** Screen header: eyebrow + h2 on the left, actions on the right. */
export function PageHeader({ eyebrow, title, actions }: { eyebrow: ReactNode; title: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <p className="t-eyebrow">{eyebrow}</p>
        <h2 className="t-h2 mt-2">{title}</h2>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export type Tone = "ok" | "warn" | "danger" | "muted" | "accent";

export function Badge({ tone = "muted", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={`badge badge-${tone} ${className}`}>{children}</span>;
}

type PillProps = {
  children: ReactNode;
  tone?: "blue" | "ghost";
  size?: "md" | "sm" | "xs";
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  title?: string;
  target?: string;
};

/** Pill CTA. Accent fills invert to white on hover; ghost fills go accent. */
export function Pill({ children, tone = "ghost", size = "md", href, onClick, type = "button", disabled, className = "", title, target }: PillProps) {
  const cls = `pill pill-${tone} ${size === "sm" ? "pill-sm" : size === "xs" ? "pill-xs" : ""} ${className}`;
  if (href) {
    if (href.startsWith("http") || href.startsWith("mailto:") || target) {
      return (
        <a href={href} className={cls} title={title} target={target} rel={target ? "noreferrer" : undefined}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} title={title}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} title={title}>
      {children}
    </button>
  );
}

/** Team / option chip. Interactive when onClick is given. */
export function Chip({ on, onClick, children, size = "md", className = "" }: { on?: boolean; onClick?: () => void; children: ReactNode; size?: "md" | "lg"; className?: string }) {
  const cls = `chip ${on ? "chip-on" : ""} ${size === "lg" ? "chip-lg" : ""} ${className}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls} aria-pressed={!!on}>
        {children}
      </button>
    );
  }
  return <span className={`${cls} chip-static`}>{children}</span>;
}

/** Nested surface-2 row. `href` makes the whole row a link. */
export function Row({ children, href, className = "", size = "md", wrap = true, style }: { children: ReactNode; href?: string; className?: string; size?: "md" | "lg"; wrap?: boolean; style?: CSSProperties }) {
  const cls = `row ${size === "lg" ? "row-lg" : ""} ${wrap ? "row-wrap" : ""} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <div className={cls} style={style}>
      {children}
    </div>
  );
}

/** Title + meta block used inside rows. */
export function RowText({ title, meta, titleSize = 15, className = "" }: { title: ReactNode; meta?: ReactNode; titleSize?: 15 | 16 | 17; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`} style={{ flex: "1 1 220px" }}>
      <p className="m-0 font-semibold" style={{ fontSize: titleSize, letterSpacing: titleSize >= 17 ? "-0.02em" : undefined }}>{title}</p>
      {meta && <p className="m-0 mt-1 text-[12px] text-muted">{meta}</p>}
    </div>
  );
}

/** Month/day date block. */
export function DateBlock({ date, size = "md" }: { date: Date; size?: "md" | "lg" }) {
  return (
    <div className="shrink-0 text-center" style={size === "lg" ? { width: 56 } : undefined}>
      <p className="m-0 text-[12px] text-muted">{monthShort(date)}</p>
      <p className="m-0 font-semibold" style={{ marginTop: 2, fontSize: size === "lg" ? 26 : 22, letterSpacing: "-0.02em", lineHeight: size === "lg" ? 1 : 1.2 }}>
        {dayNum(date)}
      </p>
    </div>
  );
}

/** Compact event row (Home / Profile sidebars). */
export function EventMini({ date, title, meta }: { date: Date; title: string; meta: string }) {
  return (
    <div className="row flex gap-4" style={{ padding: "16px 18px" }}>
      <DateBlock date={date} />
      <div className="min-w-0">
        <p className="m-0 text-[15px] font-semibold">{title}</p>
        <p className="m-0 mt-1 text-[12px] text-muted">{meta}</p>
      </div>
    </div>
  );
}

export function StatTile({ value, label, tone, surface = 2 }: { value: ReactNode; label: string; tone?: "warn" | "danger"; surface?: 1 | 2 }) {
  return (
    <div className="tile" style={surface === 1 ? { background: "var(--color-surface)", padding: 24 } : undefined}>
      <p className={surface === 1 ? "m-0 text-[36px] font-semibold leading-[1.2]" : "tile-num m-0"} style={{ letterSpacing: "-0.02em", color: tone === "warn" ? "var(--color-warn)" : tone === "danger" ? "var(--color-danger)" : undefined }}>
        {value}
      </p>
      <p className="m-0 mt-1.5 text-[13px] text-muted">{label}</p>
    </div>
  );
}

export function Hairline({ className = "" }: { className?: string }) {
  return <div className={`hairline ${className}`} />;
}

export function KeyValue({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[14px] text-muted">{k}</span>
      <span className="text-right text-[14px] font-medium">{v || <span className="text-muted">—</span>}</span>
    </div>
  );
}

/** Labelled editor field. */
export function Field({ label, children, span = false, className = "" }: { label: string; children: ReactNode; span?: boolean; className?: string }) {
  return (
    <label className={`flex flex-col gap-2 ${className}`} style={span ? { gridColumn: "1 / -1" } : undefined}>
      <span className="t-label">{label}</span>
      {children}
    </label>
  );
}

/** Field wrapper for non-input content (chip groups). */
export function FieldGroup({ label, children, span = true }: { label: string; children: ReactNode; span?: boolean }) {
  return (
    <div className="flex flex-col gap-2" style={span ? { gridColumn: "1 / -1" } : undefined}>
      <span className="t-label">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** Surface-2 toggle row ("Counts toward attendance requirement · On"). */
export function ToggleRow({ label, on, onChange }: { label: string; on: boolean; onChange?: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!on)}
      className="flex w-full items-center justify-between rounded-2xl text-left"
      style={{ gridColumn: "1 / -1", background: "var(--color-surface-2)", padding: "12px 16px", cursor: onChange ? "pointer" : "default" }}
      aria-pressed={on}
    >
      <span className="text-[14px] font-medium">{label}</span>
      <span className="text-[13px] font-semibold" style={{ color: on ? "var(--color-ok)" : "var(--color-muted)" }}>{on ? "On" : "Off"}</span>
    </button>
  );
}

export function ArrowCircle({ on = false }: { on?: boolean }) {
  return (
    <span className={`arrow ${on ? "arrow-on" : ""}`}>
      <ArrowRight className="h-5 w-5" />
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="m-0 text-[15px] text-muted">{children}</p>;
}
