"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/grail", label: "My Grail" },
  { href: "/leagues", label: "Leagues" },
];

export function NavBar({ displayName, isAdmin }: { displayName: string | null; isAdmin?: boolean }) {
  const path = usePathname();

  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-bold text-zinc-100 tracking-tight">
            Project Grail
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  path.startsWith(href)
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  path.startsWith("/admin")
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">{displayName ?? "Adventurer"}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-200"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
