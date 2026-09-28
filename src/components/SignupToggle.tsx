"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/utils/api";
import { Pill, ToggleRow } from "@/components/ui";

/**
 * Flips `config/portal.requireApproval` immediately (no Save button), so exec
 * can open sign-up at the start of a GM and close it after with one click.
 * `variant="banner"` is the Overview reminder shown while sign-up is open.
 */
export default function SignupToggle({ requireApproval, variant = "row" }: { requireApproval: boolean; variant?: "row" | "banner" }) {
  const router = useRouter();
  const [on, setOn] = useState(requireApproval);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flip = async (next: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/config", "PATCH", { requireApproval: next });
      setOn(next);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change the setting.");
    } finally {
      setBusy(false);
    }
  };

  if (variant === "banner") {
    if (on) return null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl" style={{ padding: "18px 22px", background: "color-mix(in srgb, var(--color-warn) 12%, var(--color-surface-1, #16141c))", border: "1px solid color-mix(in srgb, var(--color-warn) 40%, transparent)" }}>
        <div className="min-w-0">
          <p className="m-0 text-[15px] font-semibold" style={{ color: "var(--color-warn)" }}>Open sign-up is on</p>
          <p className="m-0 mt-1 text-[13px] text-muted">Anyone who signs in with Google becomes an active member right away. Turn approval back on after the GM.</p>
        </div>
        <Pill size="sm" tone="blue" onClick={() => flip(true)} disabled={busy}>{busy ? "Saving…" : "Require approval again"}</Pill>
        {error && <p className="m-0 w-full text-[13px]" style={{ color: "var(--color-danger)" }}>{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ToggleRow label="New accounts need exec approval" on={on} onChange={busy ? undefined : flip} />
      <p className="m-0 text-[12px]" style={{ color: on ? "var(--color-muted)" : "var(--color-warn)" }}>
        {on
          ? "New Google sign-ins wait on the pending screen until an exec activates them (or their email was added under Members first)."
          : "Open sign-up: new sign-ins, and anyone still pending, become active members immediately. Field teams stay empty until you assign them."}
      </p>
      {error && <p className="m-0 text-[13px]" style={{ color: "var(--color-danger)" }}>{error}</p>}
    </div>
  );
}
