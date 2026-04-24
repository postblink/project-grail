import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

export const metadata: Metadata = { title: "My Grail — Project Grail" };
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getCurrentSeason, getOrCreateGrail, getGrailItems } from "@/lib/grail";
import { GrailView } from "./_components/GrailView";
import { ShareGrailButton } from "./_components/ShareGrailButton";
import { buildFilterForgeUrl } from "@/lib/filterforge";

export default async function GrailPage() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");

  const season = await getCurrentSeason();
  if (!season) {
    return (
      <div className="rounded-xl border border-amber-800/40 bg-amber-900/20 p-6 text-amber-300">
        <p className="font-medium">No active season</p>
        <p className="mt-1 text-sm text-amber-400/70">
          An admin needs to create and activate a season before you can start tracking.
        </p>
      </div>
    );
  }

  const [grail, pd2Account] = await Promise.all([
    getOrCreateGrail(session.user.id, season.id),
    db.account.findFirst({ where: { userId: session.user.id, provider: "pd2" }, select: { id: true } }),
  ]);
  const items = await getGrailItems(grail.id);
  const filterForgeUrl = buildFilterForgeUrl(items);
  const pd2Linked = pd2Account !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">My Grail</h1>
          <p className="mt-0.5 text-sm text-zinc-500">{season.name}</p>
          <div className="mt-2">
            {session.user.display_name ? (
              <ShareGrailButton username={session.user.display_name} />
            ) : (
              <Link
                href="/settings"
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                title="Set a display name in Settings to get a shareable public grail link"
              >
                Set a display name to share your grail →
              </Link>
            )}
          </div>
        </div>
        <a
          href={filterForgeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Open your found items in FilterForge"
        >
          Open in FilterForge →
        </a>
      </div>
      <GrailView grailId={grail.id} initialItems={items} pd2Linked={pd2Linked} />
    </div>
  );
}
