"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/utils/api";

/** Reopen a closed posting: status → live, deadline cleared (rolling). */
export default function ReopenButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const reopen = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Reopen this posting? It goes live again with a rolling deadline.")) return;
    setBusy(true);
    try {
      await api("/api/admin/opportunities", "PATCH", { id, status: "live", closesAt: null });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={reopen} disabled={busy} className="pill pill-ghost pill-xs">
      {busy ? "Reopening…" : "Reopen"}
    </button>
  );
}
