import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { listPublicLeagues, getUserLeagues } from "@/lib/leagues";

export const metadata: Metadata = { title: "Leagues — Project Grail" };

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
    <div className="space-y-7">
      <header className="reliquary-page-head">
        <div>
          <p className="reliquary-kicker">Shared registers</p>
          <h1 className="reliquary-page-title mt-3">Leagues</h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-500">
            Compare the hunt, pool the grail, or race for the final entry.
          </p>
        </div>
        <Link
          href="/leagues/create"
          className="reliquary-action"
        >
          Create League
        </Link>
      </header>

      {/* My leagues */}
      {myMemberships.length > 0 && (
        <section className="reliquary-panel">
          <div className="reliquary-panel-head">
            <h2 className="reliquary-panel-title">My league entries</h2>
            <span className="reliquary-kicker">{myMemberships.length} registered</span>
          </div>
          <div>
            {myMemberships.map(({ league, role }) => (
              <LeagueRow key={league.id} league={league} role={role} isMember />
            ))}
          </div>
        </section>
      )}

      {/* Public leagues */}
      <section className="reliquary-panel">
        <div className="reliquary-panel-head">
          <h2 className="reliquary-panel-title">Public registers</h2>
          <span className="reliquary-kicker">{publicLeagues.length} open</span>
        </div>
        {publicLeagues.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-zinc-500">No public leagues yet this season.</p>
            <Link href="/leagues/create" className="mt-4 inline-flex reliquary-ghost">
              Create the first one →
            </Link>
          </div>
        ) : (
          <div>
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
      className="reliquary-table-row"
    >
      <div>
        <span className="text-sm font-semibold text-zinc-200">{league.name}</span>
        <span className="ml-2 reliquary-serif text-xs italic text-zinc-600">{league.season.name}</span>
        {role === "commissioner" && (
          <span className="ml-2 border-l border-amber-700 pl-2 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-400">
            Commissioner
          </span>
        )}
        {role === "co_commissioner" && (
          <span className="ml-2 border-l border-zinc-700 pl-2 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">
            Co-Commissioner
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.1em] text-zinc-500">
        <span>{TYPE_LABELS[league.league_type] ?? league.league_type}</span>
        <span>{LADDER_LABELS[league.ladder_mode] ?? league.ladder_mode}</span>
      </div>
      <span className="text-right text-xs text-zinc-500">
        {league._count.members} {league._count.members === 1 ? "hunter" : "hunters"}
        {isMember && <span className="ml-3 text-emerald-500">✓</span>} →
      </span>
    </Link>
  );
}
