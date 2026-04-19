import Link from "next/link";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      {/* Glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(196,163,82,0.18) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-xl">
        {/* Title */}
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          <span className="text-zinc-100">Project </span>
          <span className="text-amber-400">Grail</span>
        </h1>
        <p className="mt-4 text-lg text-zinc-400">Hunt every item. Claim the Grail.</p>

        {/* Feature list */}
        <ul className="mt-8 space-y-2 text-sm text-zinc-500 text-left">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-600">✦</span>
            Track one of every unique, set, and runeword item in Project Diablo 2
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-600">✦</span>
            Import your progress directly from the PD2 armory — no manual entry required
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-amber-600">✦</span>
            Compete or collaborate with friends in leagues with live leaderboards
          </li>
        </ul>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-amber-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-amber-500"
          >
            Get started — it&apos;s free
          </Link>
          <p className="text-xs text-zinc-600">
            Sign in with Discord or email · No password required
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 text-xs text-zinc-700">
        Season 13 — Betrayal · pd2grail.com
      </p>
    </main>
  );
}
