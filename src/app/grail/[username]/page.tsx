import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicGrailData, computeProgress } from "@/lib/grail";
import { buildFilterForgeUrl } from "@/lib/filterforge";
import { getUserAchievements } from "@/lib/achievements";
import { GrailChecklist } from "@/app/(app)/grail/_components/GrailChecklist";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function PublicGrailPage({ params }: Props) {
  const { username } = await params;
  const data = await getPublicGrailData(username);

  if (!data) notFound();

  const { user, season, items } = data;
  const filterForgeUrl = buildFilterForgeUrl(items);
  const [progress, achievements] = await Promise.all([
    Promise.resolve(computeProgress(items)),
    getUserAchievements(user.id),
  ]);
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
        <div className="flex items-center gap-3">
          {progress.total > 0 && (
            <p className="text-sm text-zinc-400">
              <span className="text-2xl font-bold text-zinc-100">{progress.pct}%</span>
              {" "}— {progress.found} / {progress.total} items
            </p>
          )}
          <a
            href={filterForgeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Open in FilterForge →
          </a>
        </div>
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

      {achievements.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {achievements.map((a) => (
            <div
              key={a.key}
              title={a.description}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5"
            >
              <span className={`text-sm leading-none ${a.color}`}>{a.emoji}</span>
              <span className="text-xs font-medium text-zinc-300">{a.name}</span>
            </div>
          ))}
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
  const data = await getPublicGrailData(username);

  if (!data) return { title: "Grail not found — Project Grail" };

  const { user, season, items } = data;
  const progress = computeProgress(items);
  const displayName = user.display_name ?? username;
  const title = `${displayName}'s Grail — Project Grail`;
  const description = progress.total > 0
    ? `${progress.pct}% complete · ${progress.found}/${progress.total} items found${season ? ` · ${season.name}` : ""}`
    : `${displayName} is tracking their Holy Grail in Project Diablo 2.`;

  return {
    title,
    description,
    openGraph: {
      siteName: "Project Grail",
      title,
      description,
      url: `https://pd2grail.com/grail/${encodeURIComponent(username)}`,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
