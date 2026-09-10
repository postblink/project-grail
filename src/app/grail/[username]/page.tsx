import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getPublicGrailData, computeProgress } from "@/lib/grail";
import { buildFilterForgeUrl } from "@/lib/filterforge";
import { getUserAchievements } from "@/lib/achievements";
import { GrailChecklist } from "@/app/(app)/grail/_components/GrailChecklist";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function PublicGrailPage({ params }: Props) {
  const { username } = await params;
  const session = await auth();
  const data = await getPublicGrailData(username, session?.user.id);

  if (!data) notFound();
  if ("kind" in data && data.kind === "private") return <PrivateProfile username={username} />;

  const { user, season, items } = data as Exclude<typeof data, { kind: "private" }>;
  const filterForgeUrl = buildFilterForgeUrl(items);
  const [progress, achievements] = await Promise.all([
    Promise.resolve(computeProgress(items)),
    getUserAchievements(user.id),
  ]);
  const displayName = user.display_name ?? username;

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-[#11110f]">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="reliquary-serif text-xl text-zinc-100">Project Grail</span>
            <span className="hidden text-[9px] font-bold uppercase tracking-[0.18em] text-amber-500 sm:inline">
              Public archive
            </span>
          </Link>
          <Link href="/login" className="reliquary-action">
            Track your own →
          </Link>
        </div>
      </header>
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="reliquary-page-head">
        <div>
          <p className="reliquary-kicker">Published register</p>
          <h1 className="reliquary-page-title mt-3">{displayName}&apos;s Grail</h1>
          <p className="mt-3 text-sm text-zinc-500">
            {season ? season.name : "No active season"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {progress.total > 0 && (
            <p className="text-sm text-zinc-400">
              <span className="reliquary-serif text-4xl text-zinc-100">{progress.pct}%</span>
              {" "}— {progress.found} / {progress.total} items
            </p>
          )}
          <a
            href={filterForgeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="reliquary-ghost"
          >
            Open in FilterForge →
          </a>
        </div>
      </div>

      {/* Progress bar */}
      {progress.total > 0 && (
        <div className="h-0.5 w-full overflow-hidden bg-zinc-800">
          <div
            className="h-full bg-amber-500"
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
              className="flex items-center gap-2 border border-zinc-800 bg-zinc-900 px-3 py-2"
            >
              <span className={`text-sm leading-none ${a.color}`}>{a.emoji}</span>
              <span className="reliquary-serif text-xs text-zinc-300">{a.name}</span>
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

function PrivateProfile({ username }: { username: string }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
        <p className="reliquary-kicker">Sealed register</p>
        <h1 className="mt-4 text-3xl text-zinc-100">{username}&apos;s grail is private</h1>
        <p className="mt-2 text-sm text-zinc-500">
          This player has chosen to hide their public profile.
        </p>
        <Link href="/" className="reliquary-ghost mt-7">
          ← Back to Project Grail
        </Link>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  const data = await getPublicGrailData(username);

  if (!data) return { title: "Grail not found — Project Grail" };
  if ("kind" in data && data.kind === "private") {
    return {
      title: `${username}'s grail is private — Project Grail`,
      robots: { index: false, follow: false },
    };
  }

  const { user, season, items } = data as Exclude<typeof data, { kind: "private" }>;
  const progress = computeProgress(items);
  const displayName = user.display_name ?? username;
  const title = `${displayName}'s Grail — Project Grail`;
  const description = progress.total > 0
    ? `${progress.pct}% complete · ${progress.found}/${progress.total} items found${season ? ` · ${season.name}` : ""}`
    : `${displayName} is tracking their Holy Grail in Project Diablo 2.`;

  const pageUrl = `https://pd2grail.com/grail/${encodeURIComponent(username)}`;
  const imageUrl = `${pageUrl}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      siteName: "Project Grail",
      title,
      description,
      url: pageUrl,
      type: "profile",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
