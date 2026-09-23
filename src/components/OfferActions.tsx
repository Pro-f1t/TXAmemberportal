"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/utils/api";
import { Pill } from "@/components/ui";

/** Accept / decline an offer. Accepting turns it into a current project. */
export default function OfferActions({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: "accept" | "decline") => {
    if (action === "decline" && !confirm("Decline this offer? This can't be undone.")) return;
    setBusy(action);
    setError(null);
    try {
      await api("/api/applications", "PATCH", { applicationId, action });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Pill tone="blue" size="sm" onClick={() => act("accept")} disabled={!!busy}>{busy === "accept" ? "Accepting…" : "Accept offer"}</Pill>
      <Pill size="sm" onClick={() => act("decline")} disabled={!!busy}>Decline</Pill>
      {error && <p className="m-0 w-full text-[13px]" style={{ color: "var(--color-danger)" }}>{error}</p>}
    </>
  );
}
