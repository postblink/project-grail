import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicGrailData, computeProgress } from "@/lib/grail";
import { GrailChecklist } from "@/app/(app)/grail/_components/GrailChecklist";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function PublicGrailPage({ params }: Props) {
  const { username } = await params;
  const data = await getPublicGrailData(username);

  if (!data) notFound();

  const { user, season, items } = data;
  const progress = computeProgress(items);
  const displayName = user.display_name ?? username;

  return (
    <div className="relative min-h-screen bg-zinc-950">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(196,163,82,0.18) 0%, transparent 70%)" }}
      />
      {/* Minimal top bar */}
      <header className="relative z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm font-bold text-zinc-100 tracking-tight">
            Project <span className="text-amber-400">Grail</span>
          </Link>
          <Link href="/login" className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-600 transition-colors">
            Track your own →
          </Link>
        </div>
      </header>
    <div className="relative z-10 mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{displayName}&apos;s Grail</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {season ? season.name : "No active season"}
          </p>
        </div>
        {progress.total > 0 && (
          <p className="text-sm text-zinc-400">
            <span className="text-2xl font-bold text-zinc-100">{progress.pct}%</span>
            {" "}— {progress.found} / {progress.total} items
          </p>
        )}
      </div>

      {/* Progress bar */}
      {progress.total > 0 && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-amber-500"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
      )}

      {!season ? (
        <p className="text-sm text-zinc-500">No active season to display.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {displayName} hasn&apos;t started their grail yet this season.
        </p>
      ) : (
        <GrailChecklist
          grailId=""
          items={items}
          readOnly
        />
      )}
    </div>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  return { title: `${username}'s Grail — Project Grail` };
}
