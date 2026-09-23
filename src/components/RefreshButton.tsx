"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [spun, setSpun] = useState(false);
  const refresh = () => {
    setSpun(true);
    startTransition(() => router.refresh());
    setTimeout(() => setSpun(false), 600);
  };
  return (
    <button onClick={refresh} className="pill pill-ghost !px-4 !py-2 !text-[13px]" title="Reload the latest data">
      <span style={{ display: "inline-block", transition: "transform 0.6s", transform: spun ? "rotate(360deg)" : "none" }}>↻</span>
      {pending ? " Refreshing…" : " Refresh"}
    </button>
  );
}
