import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { checkMilestoneCrossed, shouldAnnounceAchievement } from "@/lib/discord";
import { awardAchievements } from "@/lib/achievements";

const schema = z.object({
  grailId: z.string().min(1),
  itemId: z.string().min(1),
  found: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { grailId, itemId, found } = parsed.data;

  // Verify the grail belongs to the requesting user
  const grail = await db.grail.findUnique({
    where: { id: grailId },
    select: { user_id: true, season_id: true },
  });
  if (!grail || grail.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify the item exists
  const item = await db.item.findUnique({ where: { id: itemId }, select: { id: true, name: true, category: true, set_name: true, wiki_url: true } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const entry = await db.grailEntry.upsert({
    where: { grail_id_item_id: { grail_id: grailId, item_id: itemId } },
    update: {
      found,
      found_at: found ? new Date() : null,
      import_source: "manual",
    },
    create: {
      grail_id: grailId,
      item_id: itemId,
      found,
      found_at: found ? new Date() : null,
      import_source: "manual",
    },
  });

  // For hybrid leagues: record first finder in LeagueGrailEntry (best-effort).
  // Only on found=true; unchecking never removes the first-finder record.
  if (found && grail.season_id) {
    const hybridMemberships = await db.leagueMember.findMany({
      where: {
        user_id: session.user.id,
        league: { season_id: grail.season_id, league_type: "hybrid" },
      },
      select: { league_id: true },
    });

    await Promise.allSettled(
      hybridMemberships.map((m) =>
        db.leagueGrailEntry.upsert({
          where: { league_id_item_id: { league_id: m.league_id, item_id: itemId } },
          update: {},   // no-op — first finder keeps credit
          create: { league_id: m.league_id, item_id: itemId, found_by_user_id: session.user.id },
        }),
      ),
    );
  }

  // Achievements — await so we can return newly unlocked keys to the client
  let foundItems = 0;
  let totalItems = 0;
  let newAchievements: string[] = [];
  if (found) {
    [totalItems, foundItems] = await Promise.all([
      db.item.count({ where: { is_active: true } }),
      db.grailEntry.count({ where: { grail_id: grailId, found: true } }),
    ]);
    newAchievements = await awardAchievements({
      userId: session.user.id,
      grailId,
      foundCount: foundItems,
      totalCount: totalItems,
      item: { category: item.category, set_name: item.set_name },
    });
  }

  // Discord batch upsert — best-effort, never block the response
  if (found && grail.season_id) {
    void (async () => {
      try {
        const user = await db.user.findUnique({
          where: { id: session.user.id },
          select: { display_name: true },
        });
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

        const prevFound = foundItems - 1;
        const milestone = checkMilestoneCrossed(prevFound, foundItems, totalItems);
        const announceableAchievements = newAchievements.filter(shouldAnnounceAchievement);
        const pctBefore = Math.round((Math.max(0, prevFound) / totalItems) * 100);
        const pctCurrent = Math.round((foundItems / totalItems) * 100);
        const flushAfter = new Date(Date.now() + 3 * 60 * 1000);

        await Promise.allSettled(
          leagues.map(async (league) => {
            const existing = await db.discordBatch.findUnique({
              where: { league_id_user_id: { league_id: league.id, user_id: session.user.id } },
            });

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
                  items_found: existing.items_found + 1,
                  pct_current: pctCurrent,
                  found_current: foundItems,
                  total: totalItems,
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
                  items_found: 1,
                  pct_before: pctBefore,
                  pct_current: pctCurrent,
                  found_current: foundItems,
                  total: totalItems,
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

  return NextResponse.json({ entry, newAchievements });
}
