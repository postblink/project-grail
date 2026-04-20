import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notifyItemFound, notifyMilestone, checkMilestoneCrossed, notifyAchievementUnlocked, shouldAnnounceAchievement } from "@/lib/discord";
import { awardAchievements } from "@/lib/achievements";
import { getAchievementDef } from "@/lib/achievement-defs";

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
  const item = await db.item.findUnique({ where: { id: itemId }, select: { id: true, name: true, category: true, set_name: true } });
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
      db.grailEntry.count({ where: { grail_id: grailId } }),
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

  // Discord webhook notifications — best-effort, never block the response
  if (found && grail.season_id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { display_name: true },
    });
    const displayName = user?.display_name ?? "Someone";

    const leagues = await db.league.findMany({
      where: {
        season_id: grail.season_id,
        discord_webhook_url: { not: null },
        members: { some: { user_id: session.user.id } },
      },
      select: { name: true, discord_webhook_url: true },
    });

    if (leagues.length > 0) {
      const prevFound = foundItems - 1;
      const milestone = checkMilestoneCrossed(prevFound, foundItems, totalItems);
      const announceableAchievements = newAchievements.filter(shouldAnnounceAchievement);

      await Promise.allSettled(
        leagues.flatMap((league) => {
          const url = league.discord_webhook_url!;
          const tasks = [
            notifyItemFound({ webhookUrl: url, displayName, itemName: item.name, leagueName: league.name, foundCount: foundItems, totalCount: totalItems }),
          ];
          if (milestone !== null) {
            tasks.push(notifyMilestone({ webhookUrl: url, displayName, milestone, leagueName: league.name, foundCount: foundItems, totalCount: totalItems }));
          }
          for (const key of announceableAchievements) {
            const def = getAchievementDef(key);
            tasks.push(notifyAchievementUnlocked({
              webhookUrl: url,
              displayName,
              achievementName: def.name,
              achievementDescription: def.description,
              achievementEmoji: def.emoji,
              leagueName: league.name,
            }));
          }
          return tasks;
        }),
      );
    }
  }

  return NextResponse.json({ entry, newAchievements });
}
