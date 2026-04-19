import Link from "next/link";
import { auth } from "@/auth";
import { getCurrentSeason, getOrCreateGrail, getGrailItems, computeProgress } from "@/lib/grail";

export default async function DashboardPage() {
  const session = await auth();
  const season = await getCurrentSeason();

  let progress = null;
  if (season && session?.user.id) {
    const grail = await getOrCreateGrail(session.user.id, season.id);
    const items = await getGrailItems(grail.id);
    progress = computeProgress(items);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">
          Welcome back, {session?.user.display_name ?? "Adventurer"}
        </h1>
        {season ? (
          <p className="mt-1 text-sm text-zinc-500">Active season: {season.name}</p>
        ) : (
          <p className="mt-1 text-sm text-amber-500">No active season — check back soon.</p>
        )}
      </div>

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
