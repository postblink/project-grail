"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

const AUTHED_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/grail", label: "My Grail" },
  { href: "/leagues", label: "Leagues" },
  { href: "/achievements", label: "Achievements" },
];

const ANON_NAV = [{ href: "/leagues", label: "Leagues" }];

export function NavBar({ displayName, isAdmin, isAuthed = true }: { displayName: string | null; isAdmin?: boolean; isAuthed?: boolean }) {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = isAuthed
    ? [...AUTHED_NAV, ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : [])]
    : ANON_NAV;

  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href={isAuthed ? "/dashboard" : "/"} className="text-sm font-bold text-zinc-100 tracking-tight whitespace-nowrap">
            Project Grail
          </Link>
          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  path.startsWith(href)
                    ? "bg-zinc-800 text-zinc-100"
                    : href === "/admin" ? "text-zinc-600 hover:text-zinc-300" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Desktop right side */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthed ? (
            <>
              <Link href="/settings" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                {displayName ?? "Adventurer"}
                <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="opacity-60">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(path)}`}
              className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-600"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="sm:hidden p-2 text-zinc-400 hover:text-zinc-100"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden border-t border-zinc-800 bg-zinc-950 px-4 py-3 space-y-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                path.startsWith(href)
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
            {isAuthed ? (
              <>
                <Link href="/settings" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                  {displayName ?? "Adventurer"}
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" className="opacity-60">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-sm text-zinc-500 hover:text-zinc-200"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(path)}`}
                className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-600"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
