import Link from "next/link";
import { auth } from "@/auth";
import { listPublicLeagues, getUserLeagues } from "@/lib/leagues";

const TYPE_LABELS: Record<string, string> = {
  hybrid: "Hybrid",
  competitive: "Competitive",
  cooperative: "Cooperative",
};

const LADDER_LABELS: Record<string, string> = {
  softcore_ladder: "SC Ladder",
  hardcore_ladder: "HC Ladder",
  softcore_nonladder: "SC Non-Ladder",
  hardcore_nonladder: "HC Non-Ladder",
};

export default async function LeaguesPage() {
  const session = await auth();
  const [publicLeagues, myMemberships] = await Promise.all([
    listPublicLeagues(),
    session?.user.id ? getUserLeagues(session.user.id) : Promise.resolve([]),
  ]);

  const myLeagueIds = new Set(myMemberships.map((m) => m.league.id));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Leagues</h1>
        <Link
          href="/leagues/create"
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-600 transition-colors"
        >
          Create League
        </Link>
      </div>

      {/* My leagues */}
      {myMemberships.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">My Leagues</h2>
          <div className="space-y-2">
            {myMemberships.map(({ league, role }) => (
              <LeagueRow key={league.id} league={league} role={role} isMember />
            ))}
          </div>
        </section>
      )}

      {/* Public leagues */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Public Leagues
        </h2>
        {publicLeagues.length === 0 ? (
          <p className="text-sm text-zinc-600">No public leagues yet.</p>
        ) : (
          <div className="space-y-2">
            {publicLeagues.map((league) => (
              <LeagueRow
                key={league.id}
                league={league}
                role={null}
                isMember={myLeagueIds.has(league.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LeagueRow({
  league,
  role,
  isMember,
}: {
  league: { id: string; name: string; slug: string; league_type: string; ladder_mode: string; season: { name: string }; _count: { members: number } };
  role: string | null;
  isMember: boolean;
}) {
  return (
    <Link
      href={`/leagues/${league.slug}`}
      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700 transition-colors"
    >
      <div>
        <span className="text-sm font-medium text-zinc-200">{league.name}</span>
        <span className="ml-2 text-xs text-zinc-600">{league.season.name}</span>
        {role === "commissioner" && (
          <span className="ml-2 rounded bg-amber-900/40 px-1.5 py-0.5 text-xs text-amber-500">Commissioner</span>
        )}
        {role === "co_commissioner" && (
          <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">Co-Commissioner</span>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-zinc-600">
        <span>{TYPE_LABELS[league.league_type] ?? league.league_type}</span>
        <span>{LADDER_LABELS[league.ladder_mode] ?? league.ladder_mode}</span>
        <span>{league._count.members} {league._count.members === 1 ? "member" : "members"}</span>
        {isMember && <span className="text-zinc-500">✓ Joined</span>}
      </div>
    </Link>
  );
}
