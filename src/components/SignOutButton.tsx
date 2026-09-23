"use client";

import { useRouter } from "next/navigation";
import { signOutClient } from "@/lib/firebase/auth";

export default function SignOutButton() {
  const router = useRouter();
  const handle = async () => {
    try { await signOutClient(); } catch {}
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
    router.refresh();
  };
  return (
    <button onClick={handle} className="pill pill-ghost pill-sm">
      Sign out
    </button>
  );
}
