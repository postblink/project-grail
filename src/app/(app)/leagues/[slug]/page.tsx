import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getLeague, getMemberRole, isCommissioner, type GrailScope } from "@/lib/leagues";
import { computeContributionScores, computeIndividualRankings } from "@/lib/contribution";
import { JoinLeague } from "./_components/JoinLeague";
import { MemberActions } from "./_components/MemberActions";
import { CopyInviteLink } from "./_components/CopyInviteLink";

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

const ROLE_LABELS: Record<string, string> = {
  commissioner: "Commissioner",
  co_commissioner: "Co-Commissioner",
  member: "Member",
};

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LeaguePage({ params }: Props) {
  const { slug } = await params;
  const [league, session] = await Promise.all([getLeague(slug), auth()]);

  if (!league) notFound();

  const userId = session?.user.id;
  const memberRole = userId ? await getMemberRole(league.id, userId) : null;
  const isMember = memberRole !== null;
  const canManage = isCommissioner(memberRole) || !!session?.user.is_admin;

  const scope = league.grail_scope as unknown as GrailScope;
  const isCoop = league.league_type === "cooperative";
  const [coopScores, individualRanks] = await Promise.all([
    isCoop ? computeContributionScores(league.id, scope, league.members) : Promise.resolve(null),
    !isCoop ? computeIndividualRankings(league.members, league.season_id, scope) : Promise.resolve(null),
  ]);
  const top5 = isCoop
    ? (coopScores ?? []).slice(0, 5).map((s) => ({ userId: s.userId, displayName: s.displayName, value: `${s.totalScore} pts`, sub: `${s.itemsFound} items` }))
    : (individualRanks ?? []).slice(0, 5).map((r) => ({ userId: r.userId, displayName: r.displayName, value: `${r.pct}%`, sub: `${r.found}/${r.total}` }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{league.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
            <span>{league.season.name}</span>
            <span>·</span>
            <span>{TYPE_LABELS[league.league_type] ?? league.league_type}</span>
            <span>·</span>
            <span>{LADDER_LABELS[league.ladder_mode] ?? league.ladder_mode}</span>
            {league.is_private && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-500">Private</span>}
          </div>
          <p className="mt-1 text-xs text-zinc-600">
            Commissioner: {league.commissioner.display_name ?? "unknown"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {canManage && (
            <Link
              href={`/leagues/${slug}/settings`}
              className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Settings
            </Link>
          )}
          {userId && !isMember && (
            <JoinLeague slug={slug} isPrivate={league.is_private} />
          )}
          {!userId && (
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/leagues/${slug}`)}`}
              className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-semibold text-amber-100 hover:bg-amber-600 transition-colors"
            >
              Sign in to join
            </Link>
          )}
          {isMember && !canManage && (
            <span className="text-xs text-emerald-700">✓ Joined</span>
          )}
        </div>
      </div>

      {/* Top 5 leaderboard */}
      {top5.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Top Contributors
            </h2>
            <Link href={`/leagues/${slug}/leaderboard`} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Full leaderboard →
            </Link>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 divide-y divide-zinc-800 overflow-hidden">
            {top5.map((entry, i) => {
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
              return (
                <div key={entry.userId} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-5 text-center text-sm">
                    {medal ?? <span className="text-xs text-zinc-600">{i + 1}</span>}
                  </span>
                  {entry.displayName ? (
                    <Link
                      href={`/grail/${encodeURIComponent(entry.displayName)}`}
                      className="flex-1 text-sm text-zinc-300 hover:text-amber-400 transition-colors truncate"
                    >
                      {entry.displayName}
                    </Link>
                  ) : (
                    <span className="flex-1 text-sm text-zinc-500 truncate">Unknown</span>
                  )}
                  <div className="text-right flex-shrink-0">
                    <span className="text-sm font-medium text-zinc-200">{entry.value}</span>
                    <span className="ml-2 text-xs text-zinc-600">{entry.sub}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Invite / share link — only shown to commissioner */}
      {canManage && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400">
              {league.invite_code ? "Invite link" : "Share link"}
            </span>
            {league.invite_code && (
              <code className="font-mono text-sm text-amber-300">{league.invite_code}</code>
            )}
          </div>
          <CopyInviteLink slug={slug} inviteCode={league.invite_code ?? ""} />
        </div>
      )}

      {/* Members */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Members · {league.members.length}
        </h2>
        <div className="space-y-1">
          {league.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5"
            >
              {m.user.display_name ? (
                <Link
                  href={`/grail/${encodeURIComponent(m.user.display_name)}`}
                  className="text-sm text-zinc-300 hover:text-amber-400 transition-colors"
                >
                  {m.user.display_name}
                </Link>
              ) : (
                <span className="text-sm text-zinc-500">Unknown</span>
              )}
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-600">{ROLE_LABELS[m.role] ?? m.role}</span>
                {userId === m.user_id && m.role !== "commissioner" && (
                  <MemberActions slug={slug} userId={m.user_id} isSelf />
                )}
                {canManage && userId !== m.user_id && m.role !== "commissioner" && (
                  <MemberActions slug={slug} userId={m.user_id} isSelf={false} displayName={m.user.display_name} />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Navigation links */}
      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Leaderboard", href: `/leagues/${slug}/leaderboard`, live: true },
          {
            label: "Team Grail",
            href: `/leagues/${slug}/team`,
            live: league.league_type === "cooperative" || league.league_type === "hybrid",
          },
          { label: "Activity Feed", href: `/leagues/${slug}/activity`, live: true },
          { label: "Missing Items", href: `/leagues/${slug}/missing`, live: true },
        ].map(({ label, href, live }) =>
          live ? (
            <Link
              key={label}
              href={href}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 flex items-center justify-between hover:border-zinc-700 hover:bg-zinc-900 transition-colors"
            >
              <span className="text-sm text-zinc-300">{label}</span>
              <span className="text-xs text-zinc-500">View →</span>
            </Link>
          ) : (
            <div
              key={label}
              className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 flex items-center justify-between opacity-50"
            >
              <span className="text-sm text-zinc-500">{label}</span>
              <span className="text-xs text-zinc-700">Members only</span>
            </div>
          )
        )}
      </section>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const league = await getLeague(slug);
  return {
    title: league ? `${league.name} — Project Grail` : "League — Project Grail",
  };
}
