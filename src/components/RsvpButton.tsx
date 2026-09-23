"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/utils/api";

/** RSVP (accent) ↔ Going (ghost). Optimistic; reverts on failure. */
export default function RsvpButton({ eventId, going: initial, disabled }: { eventId: string; going: boolean; disabled?: boolean }) {
  const router = useRouter();
  const [going, setGoing] = useState(initial);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    const next = !going;
    setGoing(next);
    setBusy(true);
    try {
      await api(`/api/events/${eventId}/rsvp`, "POST", { going: next });
      router.refresh();
    } catch {
      setGoing(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || (disabled && !going)}
      className={`pill pill-sm ${going ? "pill-ghost" : "pill-blue"}`}
      title={going ? "Cancel RSVP" : disabled ? "This event is full" : "RSVP"}
    >
      {going ? "Going" : "RSVP"}
    </button>
  );
}
