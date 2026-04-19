import Link from "next/link";
import { auth } from "@/auth";
import { getCurrentSeason, getOrCreateGrail, getGrailItems, computeProgress } from "@/lib/grail";
import { SetDisplayName } from "./_components/SetDisplayName";

export default async function DashboardPage() {
  const session = await auth();
  const season = await getCurrentSeason();

  let progress = null;
  if (season && session?.user.id) {
    const grail = await getOrCreateGrail(session.user.id, season.id);
    const items = await getGrailItems(grail.id);
    progress = computeProgress(items);
  }

  const isNewUser = !!season && !!progress && progress.found === 0;
  const needsDisplayName = !session?.user.display_name;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">
          {needsDisplayName
            ? "Welcome!"
            : isNewUser
              ? `Welcome, ${session?.user.display_name}`
              : `Welcome back, ${session?.user.display_name}`}
        </h1>
        {season ? (
          <p className="mt-1 text-sm text-zinc-500">Active season: {season.name}</p>
        ) : (
          <p className="mt-1 text-sm text-amber-500">No active season — check back soon.</p>
        )}
      </div>

      {needsDisplayName && <SetDisplayName />}

      {isNewUser ? (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-6 space-y-4 max-w-xl">
          <div>
            <h2 className="text-lg font-semibold text-amber-400">The Holy Grail Challenge</h2>
            <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
              Find one of every unique, set, and runeword item in Project Diablo 2. Track your
              progress here as you hunt across characters and seasons.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Get started</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/grail"
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white text-center transition hover:bg-amber-500"
              >
                Open my grail →
              </Link>
              <Link
                href="/leagues"
                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 text-center transition hover:bg-zinc-700"
              >
                Browse leagues
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          {progress && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Overall progress" value={`${progress.pct}%`} sub={`${progress.found} / ${progress.total} items`} />
              {Object.entries(progress.byCategory).map(([cat, { pct, found, total }]) => (
                <StatCard key={cat} label={cat} value={`${pct}%`} sub={`${found} / ${total}`} />
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <Link
              href="/grail"
              className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700"
            >
              Open grail checklist →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-zinc-100">{value}</p>
      <p className="mt-0.5 text-sm text-zinc-400">{sub}</p>
    </div>
  );
}
