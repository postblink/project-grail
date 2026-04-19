import { notFound } from "next/navigation";
import Link from "next/link";
import { getLeague, type GrailScope } from "@/lib/leagues";
import { computeContributionScores, computeIndividualRankings, SCORING } from "@/lib/contribution";

interface Props {
  params: Promise<{ slug: string }>;
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
              <span className="text-zinc-700 italic">rarity weight: coming soon</span>
            </div>
          </div>

          <CoopLeaderboard scores={coopScores} />
        </>
      )}

      {!isCoop && individualRanks && (
        <IndividualLeaderboard ranks={individualRanks} leagueType={league.league_type} />
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
  leagueType,
}: {
  ranks: Awaited<ReturnType<typeof computeIndividualRankings>>;
  leagueType: string;
}) {
  if (ranks.length === 0) {
    return <p className="text-sm text-zinc-600">No members yet.</p>;
  }

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-xs text-zinc-600 uppercase tracking-wider">
            <th className="px-4 py-2.5 text-left">#</th>
            <th className="px-4 py-2.5 text-left">Player</th>
            <th className="px-4 py-2.5 text-right">Found</th>
            <th className="px-4 py-2.5 text-right">Total</th>
            <th className="px-4 py-2.5 text-right">Complete</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {ranks.map((r, i) => (
            <tr key={r.userId} className="hover:bg-zinc-800/50 transition-colors">
              <td className="px-4 py-3 text-zinc-600">{i + 1}</td>
              <td className="px-4 py-3 text-zinc-200 font-medium">
                {r.displayName ?? "Unknown"}
              </td>
              <td className="px-4 py-3 text-right text-zinc-400">{r.found}</td>
              <td className="px-4 py-3 text-right text-zinc-600">{r.total}</td>
              <td className="px-4 py-3 text-right font-bold text-zinc-100">{r.pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
