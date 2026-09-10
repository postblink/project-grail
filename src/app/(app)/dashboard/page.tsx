import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { getCurrentSeason, getOrCreateGrail, getGrailItems, computeProgress } from "@/lib/grail";
import { getUserAchievements } from "@/lib/achievements";
import { getUserLeagues } from "@/lib/leagues";
import { db } from "@/lib/db";
import { SetDisplayName } from "./_components/SetDisplayName";
import { AchievementBadge } from "./_components/AchievementBadge";

export const metadata: Metadata = { title: "Dashboard — Project Grail" };

export default async function DashboardPage() {
  const session = await auth();
  const season = await getCurrentSeason();

  let progress = null;
  let recentAchievements: Awaited<ReturnType<typeof getUserAchievements>> = [];
  let myLeagues: Awaited<ReturnType<typeof getUserLeagues>> = [];
  let isSeasonTransition = false;

  if (season && session?.user.id) {
    const [grail, priorGrailCount, leagueMemberships] = await Promise.all([
      getOrCreateGrail(session.user.id, season.id),
      db.grail.count({
        where: { user_id: session.user.id, season_id: { not: season.id } },
      }),
      getUserLeagues(session.user.id),
    ]);
    const [items, allAchievements] = await Promise.all([
      getGrailItems(grail.id),
      getUserAchievements(session.user.id),
    ]);
    progress = computeProgress(items);
    recentAchievements = allAchievements.slice(0, 4);
    isSeasonTransition = priorGrailCount > 0 && progress.found === 0;
    myLeagues = leagueMemberships.filter((membership) => membership.league.season.slug === season.slug);
  }

  const isNewUser = !!season && !!progress && progress.found === 0 && !isSeasonTransition;
  const needsDisplayName = !session?.user.display_name;
  const displayName = session?.user.display_name;

  return (
    <div className="space-y-6">
      <header className="reliquary-page-head">
        <div>
          <p className="reliquary-kicker">Seasonal register · Dashboard</p>
          <h1 className="reliquary-page-title mt-3">
            {needsDisplayName
              ? "Welcome, hunter"
              : isNewUser
                ? `The ledger of ${displayName}`
                : `Welcome back, ${displayName}`}
          </h1>
          <p className="mt-3 text-sm text-zinc-500">
            {season ? `Active archive: ${season.name}` : "No active season — check back soon."}
          </p>
        </div>
        <Link href="/grail" className="reliquary-action">
          Open my grail
        </Link>
      </header>

      {needsDisplayName && <SetDisplayName />}

      {isSeasonTransition && season && (
        <section className="reliquary-panel border-l-2 border-l-amber-600 p-5">
          <p className="reliquary-kicker text-amber-400">New archive opened</p>
          <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-xl text-zinc-100">{season.name}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                Your previous grail has been archived. Import from the armory or begin checking
                off this season&apos;s finds.
              </p>
            </div>
            <Link href="/grail" className="reliquary-ghost shrink-0">
              Begin the record
            </Link>
          </div>
        </section>
      )}

      {isNewUser ? (
        <section className="reliquary-panel max-w-3xl">
          <div className="reliquary-panel-head">
            <h2 className="reliquary-panel-title">The Holy Grail challenge</h2>
            <span className="reliquary-kicker">Entry · 001</span>
          </div>
          <div className="p-6">
            <p className="max-w-2xl text-sm leading-7 text-zinc-300">
              Find one of every unique, set, and runeword item in Project Diablo 2. Track your
              progress here as you hunt across characters and seasons.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/grail" className="reliquary-action">
                Open my grail
              </Link>
              <Link href="/leagues" className="reliquary-ghost">
                Browse leagues
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <>
          {progress && (
            <section className="reliquary-progress-ledger" aria-label="Grail progress">
              <div className="reliquary-progress-total">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#665d4c]">
                  Overall completion
                </p>
                <div className="mt-8 flex items-end gap-3">
                  <strong>{progress.pct}</strong>
                  <span className="reliquary-serif pb-1 text-3xl">%</span>
                </div>
                <p className="mt-8 border-t border-[#988d76] pt-4 reliquary-serif text-lg">
                  {progress.found} <span className="text-[#746a57]">of</span> {progress.total} items
                </p>
              </div>

              <div className="reliquary-progress-categories">
                {Object.entries(progress.byCategory).map(([category, values]) => (
                  <div className="reliquary-progress-row" key={category}>
                    <div>
                      <p className="text-xs font-semibold capitalize text-zinc-300">{category}</p>
                      <p className="mt-1 text-[10px] text-zinc-600">
                        {values.found} / {values.total}
                      </p>
                    </div>
                    <div className="reliquary-meter" aria-hidden>
                      <span style={{ width: `${values.pct}%` }} />
                    </div>
                    <span className="reliquary-serif text-xl text-zinc-200">{values.pct}%</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="reliquary-panel">
              <div className="reliquary-panel-head">
                <h2 className="reliquary-panel-title">League registers</h2>
                <Link href="/leagues" className="reliquary-kicker hover:text-zinc-200">
                  View all
                </Link>
              </div>
              {myLeagues.length > 0 ? (
                <div>
                  {myLeagues.map(({ league, role }, index) => (
                    <Link
                      key={league.id}
                      href={`/leagues/${league.slug}`}
                      className="reliquary-table-row"
                    >
                      <div>
                        <span className="text-sm font-semibold text-zinc-200">{league.name}</span>
                        <span className="ml-2 reliquary-serif text-xs italic text-zinc-600">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-amber-400">
                        {role === "commissioner" ? "Commissioner" : "Member"}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {league._count.members} {league._count.members === 1 ? "hunter" : "hunters"} →
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-6">
                  <p className="text-sm text-zinc-500">No league entries in this archive.</p>
                  <Link href="/leagues" className="mt-4 inline-flex reliquary-ghost">
                    Find a league
                  </Link>
                </div>
              )}
            </section>

            <section className="reliquary-panel">
              <div className="reliquary-panel-head">
                <h2 className="reliquary-panel-title">Recent distinctions</h2>
                <Link href="/achievements" className="reliquary-kicker hover:text-zinc-200">
                  View all
                </Link>
              </div>
              {recentAchievements.length > 0 ? (
                <div className="grid gap-px bg-zinc-800 sm:grid-cols-2 xl:grid-cols-1">
                  {recentAchievements.map((achievement) => (
                    <AchievementBadge key={achievement.key} achievement={achievement} />
                  ))}
                </div>
              ) : (
                <p className="p-6 text-sm text-zinc-500">The first distinction is still waiting.</p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
