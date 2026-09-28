"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import { UserIcon, ChevronDown, MenuIcon, CloseIcon } from "./Icons";
import { signOutClient } from "@/lib/firebase/auth";

const EASE = "700ms cubic-bezier(0.4, 0, 0.2, 1)";
// Keep in sync with STAFF_ROLES in lib/models/Member.ts and proxy.ts.
const STAFF_ROLES = ["exec", "admin"];

const MEMBER_LINKS = [
  { href: "/", label: "Home", exact: true },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/applications", label: "Applications" },
  { href: "/events", label: "Events" },
  { href: "/members", label: "Members" },
  { href: "/profile", label: "Profile" },
];

function readRoleCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)user_role=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

type Me = { name?: string; firstName?: string; email?: string; role?: string; status?: string };

/**
 * The marketing site's morphing nav (transparent → glass pill on scroll) with
 * the portal's links. In the console the links collapse to Console / Member view.
 */
export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const r = readRoleCookie();
    setRole(r);
    if (r) {
      fetch("/api/auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((d) => {
          const u = d?.user ?? null;
          setMe(u);
          if (u?.role) setRole(String(u.role).toLowerCase());
        })
        .catch(() => {});
    } else {
      setMe(null);
    }
    // Once per load — sign-in/out and role changes cause a full reload.
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  // Close the mobile panel on navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  const signedIn = !!role;
  const isStaff = STAFF_ROLES.includes(role || "");
  const inConsole = pathname.startsWith("/admin");
  const displayName = me?.name && me.name !== "NA" ? me.name : "Account";

  // Attendance lives in the console's top bar (Jamie's call), not the side rail.
  const links = inConsole
    ? [
        { href: "/admin", label: "Console", exact: false },
        { href: "/admin/attendance", label: "Attendance", exact: false },
        { href: "/", label: "Member view", exact: true },
      ]
    : MEMBER_LINKS;
  const isActive = (l: { href: string; exact?: boolean }) =>
    l.exact ? pathname === l.href
    : l.href === "/admin" ? pathname.startsWith("/admin") && !pathname.startsWith("/admin/attendance")
    : pathname.startsWith(l.href);

  const handleSignOut = async () => {
    try { await signOutClient(); } catch {}
    await fetch("/api/auth/logout", { method: "POST" });
    setMenuOpen(false);
    setRole(null);
    setMe(null);
    router.push("/auth/login");
    router.refresh();
  };

  // The projector check-in screen is full-screen: no nav.
  if (pathname.startsWith("/live")) return null;

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center">
      <div
        className={scrolled ? "w-full" : "shell-x w-full"}
        style={{
          maxWidth: scrolled ? 1240 : "100%",
          marginTop: scrolled ? 12 : 0,
          paddingInline: scrolled ? 24 : undefined,
          paddingBlock: scrolled ? 6 : 15,
          transition: `all ${EASE}`,
          ...(scrolled
            ? {
                background: "rgba(255, 255, 255, 0.05)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 999,
                boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.1)",
              }
            : {
                background: "transparent",
                border: "1px solid transparent",
                borderRadius: 999,
                boxShadow: "none",
              }),
        }}
      >
        <div className="flex items-center justify-between gap-6">
          <Link href={inConsole ? "/admin" : "/"} aria-label="Texas Accelerate home" className="shrink-0">
            <Logo priority height={scrolled ? 28 : 36} style={{ transition: `all ${EASE}` }} />
          </Link>

          {signedIn && (
            <nav className="hidden items-center nav:flex" style={{ gap: scrolled ? 4 : 8, transition: `all ${EASE}` }} aria-label="Main">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={isActive(l) ? "page" : undefined}
                  className="whitespace-nowrap rounded-full px-4 py-2 text-[15px] font-medium text-white transition-colors hover:bg-white/15"
                  style={isActive(l) ? { background: "rgba(255,255,255,0.15)" } : undefined}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-3">
            {signedIn && isStaff && !inConsole && (
              <Link
                href="/admin"
                className="hidden whitespace-nowrap text-[15px] font-semibold text-white transition-colors hover:bg-accent hover:text-ink xl:inline-flex"
                style={{ paddingInline: 16, paddingBlock: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)" }}
              >
                Console
              </Link>
            )}

            {signedIn ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  className="flex items-center gap-2 whitespace-nowrap text-[15px] font-semibold text-white"
                  style={{ paddingInline: 16, paddingBlock: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)", transition: `all ${EASE}` }}
                >
                  <UserIcon className="h-4 w-4 text-accent" />
                  <span className="hidden max-w-[140px] truncate sm:inline">{displayName}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted" />
                </button>

                {menuOpen && (
                  <div
                    className="animate-fade-slide-down absolute right-0 z-50 mt-3 w-60 overflow-hidden rounded-2xl py-2"
                    style={{ background: "var(--color-surface-2)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}
                  >
                    <div className="mb-1 px-4 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <p className="truncate text-[13px] font-semibold text-white">{displayName}</p>
                      {me?.email && <p className="truncate text-[11px] text-muted">{me.email}</p>}
                    </div>
                    <Link href="/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-white/5 hover:text-white">
                      My profile
                    </Link>
                    {isStaff && (
                      <Link href={inConsole ? "/" : "/admin"} onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:bg-white/5 hover:text-white">
                        {inConsole ? "Member view" : "Console"}
                      </Link>
                    )}
                    <button onClick={handleSignOut} className="block w-full px-4 py-2 text-left text-[13px] font-medium text-muted transition-colors hover:bg-white/5 hover:text-white">
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="whitespace-nowrap text-[15px] font-semibold text-white"
                style={{ paddingInline: 20, paddingBlock: 10, borderRadius: 999, background: "rgba(255,255,255,0.08)", transition: `all ${EASE}` }}
              >
                Sign in
              </Link>
            )}

            {signedIn && (
              <button
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white nav:hidden"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                {mobileOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {mobileOpen && signedIn && (
        <div className="nav-panel fixed inset-x-0 top-[66px] z-40 nav:hidden" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <nav className="shell-x flex flex-col gap-1 py-4" aria-label="Mobile">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-full px-4 py-3 text-[17px] font-medium text-white transition-colors hover:bg-white/15"
                style={isActive(l) ? { background: "rgba(255,255,255,0.15)" } : undefined}
              >
                {l.label}
              </Link>
            ))}
            {isStaff && !inConsole && (
              <Link href="/admin" className="rounded-full px-4 py-3 text-[17px] font-medium text-white transition-colors hover:bg-white/15">
                Console
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
