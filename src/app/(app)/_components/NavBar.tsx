"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

const AUTHED_NAV = [
  { href: "/dashboard", label: "Dashboard", index: "I" },
  { href: "/grail", label: "My Grail", index: "II" },
  { href: "/leagues", label: "Leagues", index: "III" },
  { href: "/achievements", label: "Achievements", index: "IV" },
];

const ANON_NAV = [{ href: "/leagues", label: "Leagues", index: "I" }];

/* Grail is a fan tool built on Blizzard IP, so support stays donation-shaped:
   nothing here is ever gated behind it. Tips live on Ko-fi (0% platform cut on
   one-off tips); recurring membership lives on Patreon. */
const KOFI_URL = "https://ko-fi.com/postblink";

export function NavBar({
  displayName,
  isAdmin,
  isAuthed = true,
}: {
  displayName: string | null;
  isAdmin?: boolean;
  isAuthed?: boolean;
}) {
  const path = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = isAuthed
    ? [
        ...AUTHED_NAV,
        ...(isAdmin ? [{ href: "/admin", label: "Admin", index: "V" }] : []),
      ]
    : ANON_NAV;

  function isCurrent(href: string) {
    return href === "/dashboard" ? path === href : path.startsWith(href);
  }

  const homeHref = isAuthed ? "/dashboard" : "/";
  const accountLabel = displayName ?? "Adventurer";

  return (
    <>
      <aside className="pg-rail" aria-label="Primary navigation">
        <Link href={homeHref} className="pg-wordmark">
          <span className="pg-wordmark-kicker">Archive · PG</span>
          <span className="pg-wordmark-name">Project Grail</span>
          <span className="pg-wordmark-sub">The hunter&apos;s reliquary</span>
        </Link>

        <nav className="pg-nav">
          <p className="pg-nav-label">Ledger</p>
          {navLinks.map(({ href, label, index }) => (
            <Link
              key={href}
              href={href}
              className="pg-nav-link"
              aria-current={isCurrent(href) ? "page" : undefined}
            >
              <span>{label}</span>
              <span className="pg-nav-index">{index}</span>
            </Link>
          ))}
        </nav>

        <div className="pg-rail-footer">
          <p className="pg-nav-label px-0">Bearer</p>
          {isAuthed ? (
            <>
              <Link
                href="/settings"
                className="block border-l-2 border-transparent py-2 text-xs font-semibold text-zinc-300 transition-colors hover:border-amber-500 hover:text-zinc-100"
              >
                {accountLabel}
                <span className="mt-1 block font-normal text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                  Account settings
                </span>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600 transition-colors hover:text-zinc-300"
              >
                Close ledger
              </button>
            </>
          ) : (
            <Link href={`/login?callbackUrl=${encodeURIComponent(path)}`} className="reliquary-action">
              Sign in
            </Link>
          )}

          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 block border-t border-zinc-800 pt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600 transition-colors hover:text-amber-400"
          >
            Support the ledger
            <span className="mt-1 block text-[10px] font-normal normal-case tracking-normal">
              Ko-fi — opens in a new tab
            </span>
          </a>
        </div>
      </aside>

      <header className="pg-mobile-header">
        <div className="flex min-h-16 items-center justify-between px-4">
          <Link href={homeHref} className="reliquary-serif text-xl text-zinc-100">
            Project Grail
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="border border-zinc-700 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>

        {menuOpen && (
          <div id="mobile-navigation" className="border-t border-zinc-800 bg-zinc-950 px-3 py-3">
            <nav className="pg-nav mt-0" aria-label="Mobile navigation">
              {navLinks.map(({ href, label, index }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="pg-nav-link"
                  aria-current={isCurrent(href) ? "page" : undefined}
                >
                  <span>{label}</span>
                  <span className="pg-nav-index">{index}</span>
                </Link>
              ))}
            </nav>
            <div className="mt-3 flex items-center justify-between border-t border-zinc-800 px-2 pt-3">
              {isAuthed ? (
                <>
                  <Link href="/settings" onClick={() => setMenuOpen(false)} className="text-xs text-zinc-400">
                    {accountLabel}
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent(path)}`}
                  onClick={() => setMenuOpen(false)}
                  className="reliquary-action"
                >
                  Sign in
                </Link>
              )}
              <a
                href={KOFI_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600"
              >
                Support
              </a>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
