"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Hides server-rendered chrome (the footer) on the live display and in the console. */
export default function HideOn({ prefixes, children }: { prefixes: string[]; children: ReactNode }) {
  const path = usePathname();
  return prefixes.some((p) => path.startsWith(p)) ? null : <>{children}</>;
}
