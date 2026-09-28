"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Hides server-rendered chrome (the footer) on full-screen routes like the live check-in display. */
export default function HideOn({ prefix, children }: { prefix: string; children: ReactNode }) {
  return usePathname().startsWith(prefix) ? null : <>{children}</>;
}
