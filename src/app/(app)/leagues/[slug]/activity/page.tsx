import { notFound } from "next/navigation";
import Link from "next/link";
import { getLeague } from "@/lib/leagues";
import { getLeagueActivity } from "@/lib/activity";
import { RelativeTime } from "./_components/RelativeTime";

const CATEGORY_COLORS: Record<string, string> = {
  unique: "text-amber-400",
  set:    "text-emerald-400",
  runeword: "text-sky-400",
  rune:   "text-violet-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  unique: "Unique",
  set:    "Set",
  runeword: "Runeword",
  rune:   "Rune",
};

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ActivityPage({ params }: Props) {
  const { slug } = await params;
  const league = await getLeague(slug);
  if (!league) notFound();

  const events = await getLeagueActivity(league, 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/leagues/${slug}`} className="text-sm text-zinc-500 hover:text-zinc-300">
          ← {league.name}
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-zinc-100">Activity</h1>

      {events.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-600">
          No activity yet. Start checking off items!
        </p>
      ) : (
        <ol className="relative border-l border-zinc-800 space-y-0 ml-3">
          {events.map((event) => (
            <li key={event.id} className="pl-6 pb-6 relative">
              {/* Timeline dot */}
              <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-zinc-900 bg-zinc-700" />

              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-sm font-semibold text-zinc-200">
                  {event.displayName ?? "Unknown"}
                </span>
                <span className="text-sm text-zinc-500">found</span>
                <span className={`text-sm font-medium ${CATEGORY_COLORS[event.itemCategory] ?? "text-zinc-300"}`}>
                  {event.itemName}
                </span>
                {event.itemType && (
                  <span className="text-xs text-zinc-600">· {event.itemType}</span>
                )}
                <span className="ml-auto text-xs text-zinc-600">
                  <RelativeTime date={new Date(event.foundAt)} />
                </span>
              </div>

              <span className={`text-xs ${CATEGORY_COLORS[event.itemCategory] ?? "text-zinc-600"} opacity-60`}>
                {CATEGORY_LABELS[event.itemCategory] ?? event.itemCategory}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
