"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/utils/api";

/**
 * Permanently delete an archived posting (and the applications sent to it).
 * `after` = where to go once it's gone; omit to stay on the list and refresh.
 */
export default function DeletePostingButton({ id, title, applications, projects, after, size = "xs" }: { id: string; title: string; applications: number; projects: number; after?: string; size?: "xs" | "md" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const remove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const extra = applications === 0
      ? "Nobody applied to it."
      : `Its ${applications} application${applications === 1 ? "" : "s"} will be deleted too${projects ? `, including ${projects} placed or completed project${projects === 1 ? "" : "s"} that will disappear from those members' profiles` : ""}.`;
    if (!confirm(`Delete "${title}" for good?\n\n${extra}\n\nThis can't be undone.`)) return;
    setBusy(true);
    try {
      await api("/api/admin/opportunities", "DELETE", { id });
      if (after) router.push(after);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete the posting.");
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={remove} disabled={busy} className={`pill pill-ghost ${size === "xs" ? "pill-xs" : ""}`} style={{ color: "var(--color-danger)" }}>
      {busy ? "Deleting…" : size === "xs" ? "Delete" : "Delete posting"}
    </button>
  );
}
