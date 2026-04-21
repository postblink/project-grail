import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notifyMilestone, checkMilestoneCrossed } from "@/lib/discord";
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

    // Achievements — award for each imported item, best-effort
    const [totalCount, foundCount] = await Promise.all([
      db.item.count({ where: { is_active: true } }),
      db.grailEntry.count({ where: { grail_id: grailId, found: true } }),
    ]);
    void Promise.allSettled(
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

    // Discord milestone notifications for armory imports (milestone only — not per-item for bulk)
    if (grail.season_id) {
      const user = await db.user.findUnique({ where: { id: session.user.id }, select: { display_name: true } });
      const displayName = user?.display_name ?? "Someone";
      const profileUrl = `https://pd2grail.com/grail/${encodeURIComponent(displayName)}`;

      const leagues = await db.league.findMany({
        where: {
          season_id: grail.season_id,
          discord_webhook_url: { not: null },
          members: { some: { user_id: session.user.id } },
        },
        select: { name: true, discord_webhook_url: true },
      });

      if (leagues.length > 0) {
        const prevFound = foundCount - itemIds.length;
        const milestone = checkMilestoneCrossed(Math.max(0, prevFound), foundCount, totalCount);

        if (milestone !== null) {
          await Promise.allSettled(
            leagues.map((league) =>
              notifyMilestone({ webhookUrl: league.discord_webhook_url!, displayName, profileUrl, milestone, leagueName: league.name, foundCount, totalCount })
            ),
          );
        }
      }
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
