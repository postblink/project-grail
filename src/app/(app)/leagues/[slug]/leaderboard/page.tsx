import { notFound } from "next/navigation";
import Link from "next/link";
import { getLeague, type GrailScope } from "@/lib/leagues";
import { computeContributionScores, computeIndividualRankings, SCORING } from "@/lib/contribution";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const league = await getLeague(slug);
  return { title: league ? `${league.name} Leaderboard — Project Grail` : "Leaderboard — Project Grail" };
}

export default async function LeaderboardPage({ params }: Props) {
  const { slug } = await params;
  const league = await getLeague(slug);
  if (!league) notFound();

  const scope = league.grail_scope as unknown as GrailScope;
  const isCoop = league.league_type === "cooperative";

  const [coopScores, individualRanks] = await Promise.all([
    isCoop ? computeContributionScores(league.id, scope, league.members) : Promise.resolve(null),
    !isCoop ? computeIndividualRankings(league.members, league.season_id, scope) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/leagues/${slug}`} className="text-sm text-zinc-500 hover:text-zinc-300">
          ← {league.name}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Leaderboard</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          {league.season.name} ·{" "}
          {isCoop ? "Cooperative — ranked by contribution" : "Ranked by individual completion"}
        </p>
      </div>

      {isCoop && coopScores && (
        <>
          {/* Scoring legend */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-2">Scoring</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
              <span>{SCORING.BASE_ITEM_POINTS} pt per item found</span>
              <span>+{SCORING.FIRST_SET_ITEM_BONUS} first set item</span>
              <span>+{SCORING.SET_COMPLETION_BONUS} per set completed</span>
            </div>
          </div>

          <CoopLeaderboard scores={coopScores} />
        </>
      )}

      {!isCoop && individualRanks && (
        <IndividualLeaderboard ranks={individualRanks} />
      )}
    </div>
  );
}

function CoopLeaderboard({
  scores,
}: {
  scores: Awaited<ReturnType<typeof computeContributionScores>>;
}) {
  if (scores.length === 0) {
    return <p className="text-sm text-zinc-600">No members yet.</p>;
  }

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-xs text-zinc-600 uppercase tracking-wider">
            <th className="px-4 py-2.5 text-left">#</th>
            <th className="px-4 py-2.5 text-left">Player</th>
            <th className="px-4 py-2.5 text-right">Items</th>
            <th className="px-4 py-2.5 text-right">Contribution</th>
            <th className="px-4 py-2.5 text-right">Bonuses</th>
            <th className="px-4 py-2.5 text-right font-semibold">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {scores.map((s, i) => (
            <tr key={s.userId} className="hover:bg-zinc-800/50 transition-colors">
              <td className="px-4 py-3 text-zinc-600">{i + 1}</td>
              <td className="px-4 py-3 text-zinc-200 font-medium">
                {s.displayName ?? "Unknown"}
                <BonusIndicators bonuses={s.bonuses} />
              </td>
              <td className="px-4 py-3 text-right text-zinc-400">{s.itemsFound}</td>
              <td className="px-4 py-3 text-right text-zinc-400">{s.contributionPct}%</td>
              <td className="px-4 py-3 text-right text-amber-500">{s.bonusPoints > 0 ? `+${s.bonusPoints}` : "—"}</td>
              <td className="px-4 py-3 text-right font-bold text-zinc-100">{s.totalScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BonusIndicators({ bonuses }: { bonuses: { firstSetItem: boolean; setsCompleted: number } }) {
  return (
    <span className="ml-2 inline-flex gap-1">
      {bonuses.firstSetItem && (
        <span title="First set item found" className="rounded bg-amber-900/40 px-1 text-xs text-amber-500">★ First</span>
      )}
      {bonuses.setsCompleted > 0 && (
        <span title={`Completed ${bonuses.setsCompleted} set${bonuses.setsCompleted > 1 ? "s" : ""}`} className="rounded bg-zinc-800 px-1 text-xs text-zinc-400">
          ✓{bonuses.setsCompleted}
        </span>
      )}
    </span>
  );
}

function IndividualLeaderboard({
  ranks,
}: {
  ranks: Awaited<ReturnType<typeof computeIndividualRankings>>;
}) {
  if (ranks.length === 0) {
    return <p className="text-sm text-zinc-600">No members yet.</p>;
  }

  const RANK_STYLES: Record<number, string> = {
    1: "border-amber-700/50 bg-amber-900/10",
    2: "border-zinc-600/50 bg-zinc-800/30",
    3: "border-zinc-700/50 bg-zinc-800/20",
  };
  const RANK_LABELS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <div className="space-y-2">
      {ranks.map((r, i) => {
        const rank = i + 1;
        const cardStyle = RANK_STYLES[rank] ?? "border-zinc-800 bg-zinc-900";
        return (
          <div key={r.userId} className={`rounded-xl border px-4 py-3 ${cardStyle}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="w-6 text-center text-sm">
                  {RANK_LABELS[rank] ?? <span className="text-zinc-600">{rank}</span>}
                </span>
                {r.displayName ? (
                  <Link href={`/grail/${encodeURIComponent(r.displayName)}`} className="text-sm font-medium text-zinc-200 hover:text-amber-400 transition-colors">
                    {r.displayName}
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-zinc-500">Unknown</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-zinc-100">{r.pct}%</span>
                <span className="ml-2 text-xs text-zinc-600">{r.found}/{r.total}</span>
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${r.pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
