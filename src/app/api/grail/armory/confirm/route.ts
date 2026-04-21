import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { checkMilestoneCrossed, shouldAnnounceAchievement } from "@/lib/discord";
import { awardAchievements } from "@/lib/achievements";

const schema = z.object({
  grailId: z.string().min(1),
  itemIds: z.array(z.string().min(1)).min(1).max(2000),
  characters: z.array(z.string().min(1)).min(1).max(10),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { grailId, itemIds, characters } = parsed.data;

  const grail = await db.grail.findUnique({ where: { id: grailId }, select: { user_id: true, season_id: true } });
  if (!grail || grail.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify all submitted itemIds are real active items (prevents injecting arbitrary IDs)
  const validItems = await db.item.findMany({
    where: { id: { in: itemIds }, is_active: true },
    select: { id: true, category: true, set_name: true },
  });
  if (validItems.length !== itemIds.length) {
    return NextResponse.json({ error: "One or more item IDs are invalid" }, { status: 400 });
  }

  const now = new Date();

  try {
    const [, armoryImport] = await db.$transaction([
      // Upsert a GrailEntry for every confirmed item
      ...itemIds.map((itemId) =>
        db.grailEntry.upsert({
          where: { grail_id_item_id: { grail_id: grailId, item_id: itemId } },
          update: { found: true, found_at: now, import_source: "armory" },
          create: { grail_id: grailId, item_id: itemId, found: true, found_at: now, import_source: "armory" },
        })
      ),
      // Record the import run
      db.armoryImport.create({
        data: {
          grail_id: grailId,
          user_id: session.user.id,
          characters,
          status: "success",
          items_added: itemIds.length,
        },
      }),
    ]);

    // For hybrid leagues: upsert LeagueGrailEntry for each found item (first-finder semantics).
    if (grail.season_id) {
      const hybridMemberships = await db.leagueMember.findMany({
        where: {
          user_id: session.user.id,
          league: { season_id: grail.season_id, league_type: "hybrid" },
        },
        select: { league_id: true },
      });

      await Promise.allSettled(
        hybridMemberships.flatMap((m) =>
          itemIds.map((itemId) =>
            db.leagueGrailEntry.upsert({
              where: { league_id_item_id: { league_id: m.league_id, item_id: itemId } },
              update: {},
              create: { league_id: m.league_id, item_id: itemId, found_by_user_id: session.user.id },
            }),
          ),
        ),
      );
    }

    // Achievements — award for each imported item, collect results
    const [totalCount, foundCount] = await Promise.all([
      db.item.count({ where: { is_active: true } }),
      db.grailEntry.count({ where: { grail_id: grailId, found: true } }),
    ]);
    const allNewAchievements: string[] = [];
    const achievementResults = await Promise.allSettled(
      validItems.map((item, i) =>
        awardAchievements({
          userId: session.user.id,
          grailId,
          foundCount: foundCount - validItems.length + i + 1,
          totalCount,
          item: { category: item.category, set_name: item.set_name },
        }),
      ),
    );
    for (const r of achievementResults) {
      if (r.status === "fulfilled") allNewAchievements.push(...r.value);
    }

    // Discord batch upsert for armory imports — best-effort
    if (grail.season_id) {
      void (async () => {
        try {
          const user = await db.user.findUnique({ where: { id: session.user.id }, select: { display_name: true } });
          const displayName = user?.display_name ?? "Someone";
          const profileUrl = `https://pd2grail.com/grail/${encodeURIComponent(displayName)}`;

          const leagues = await db.league.findMany({
            where: {
              season_id: grail.season_id!,
              discord_webhook_url: { not: null },
              members: { some: { user_id: session.user.id } },
            },
            select: { id: true, name: true, discord_webhook_url: true },
          });

          if (leagues.length === 0) return;

          const prevFound = foundCount - itemIds.length;
          const milestone = checkMilestoneCrossed(Math.max(0, prevFound), foundCount, totalCount);
          const pctBefore = Math.round((Math.max(0, prevFound) / totalCount) * 100);
          const pctCurrent = Math.round((foundCount / totalCount) * 100);
          const flushAfter = new Date(Date.now() + 3 * 60 * 1000);
          const announceableAchievements = [...new Set(allNewAchievements.filter(shouldAnnounceAchievement))];

          await Promise.allSettled(
            leagues.map(async (league) => {
              const found = await db.discordBatch.findUnique({
                where: { league_id_user_id: { league_id: league.id, user_id: session.user.id } },
              });
              const existing = found && found.flush_after > new Date() ? found : null;
              if (found && !existing) {
                await db.discordBatch.delete({ where: { id: found.id } }).catch(() => null);
              }

              if (existing) {
                const mergedMilestones = milestone !== null && !existing.milestones.includes(milestone)
                  ? [...existing.milestones, milestone]
                  : existing.milestones;
                const mergedAchievements = [
                  ...existing.achievement_keys,
                  ...announceableAchievements.filter((k) => !existing.achievement_keys.includes(k)),
                ];
                await db.discordBatch.update({
                  where: { id: existing.id },
                  data: {
                    items_found: existing.items_found + itemIds.length,
                    pct_current: pctCurrent,
                    found_current: foundCount,
                    total: totalCount,
                    milestones: mergedMilestones,
                    achievement_keys: mergedAchievements,
                    flush_after: flushAfter,
                  },
                });
              } else {
                await db.discordBatch.create({
                  data: {
                    league_id: league.id,
                    user_id: session.user.id,
                    display_name: displayName,
                    profile_url: profileUrl,
                    items_found: itemIds.length,
                    pct_before: pctBefore,
                    pct_current: pctCurrent,
                    found_current: foundCount,
                    total: totalCount,
                    milestones: milestone !== null ? [milestone] : [],
                    achievement_keys: announceableAchievements,
                    flush_after: flushAfter,
                  },
                });
              }
            }),
          );
        } catch {
          // best-effort
        }
      })();
    }

    return NextResponse.json({ added: itemIds.length, importId: armoryImport.id });
  } catch (err) {
    // Best-effort: log the failed import run
    await db.armoryImport.create({
      data: {
        grail_id: grailId,
        user_id: session.user.id,
        characters,
        status: "failed",
        items_added: 0,
        error_details: err instanceof Error ? err.message : "Unknown error",
      },
    }).catch(() => {});

    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
