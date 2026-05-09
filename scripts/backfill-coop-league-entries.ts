/**
 * Backfill LeagueGrailEntry records for cooperative leagues from existing
 * personal GrailEntry records.
 *
 * Why: Until commit cfd3c85, the grail-entry and armory-confirm routes only
 * propagated finds to LeagueGrailEntry for hybrid leagues. Cooperative leagues
 * were silently skipped, so their leaderboards showed 0 pts for everyone even
 * though members had found hundreds of items in their personal grails.
 *
 * For each cooperative league, walk every member's GrailEntry rows (for the
 * league's season, found=true, item is_active and in scope) and upsert a
 * LeagueGrailEntry per item. First-finder wins by earliest found_at.
 *
 * Idempotent: re-running won't double-credit (upsert with no-op update).
 */
import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

interface GrailScope {
  unique?: boolean;
  set?: boolean;
  runeword?: boolean;
  rune?: boolean;
  pd2_exclusive?: boolean;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(dryRun ? "DRY RUN — no writes" : "LIVE — will write LeagueGrailEntry rows");

  const leagues = await db.league.findMany({
    where: { league_type: "cooperative" },
    include: {
      members: { select: { user_id: true } },
      season: { select: { name: true } },
    },
  });

  console.log(`\nFound ${leagues.length} cooperative league(s)`);

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const league of leagues) {
    const scope = (league.grail_scope ?? {}) as GrailScope;
    const activeCategories = (["unique", "set", "runeword", "rune"] as const).filter(
      (cat) => scope[cat] !== false,
    );
    const memberIds = league.members.map((m) => m.user_id);

    console.log(
      `\n• ${league.name} (${league.season.name}) — ${memberIds.length} member(s), categories: ${activeCategories.join(", ")}`,
    );

    if (memberIds.length === 0 || activeCategories.length === 0) {
      console.log("  (skipped — no members or no categories in scope)");
      continue;
    }

    const grails = await db.grail.findMany({
      where: { user_id: { in: memberIds }, season_id: league.season_id },
      select: { id: true, user_id: true },
    });
    const grailIds = grails.map((g) => g.id);
    const grailToUser = new Map(grails.map((g) => [g.id, g.user_id]));

    const entries = await db.grailEntry.findMany({
      where: {
        grail_id: { in: grailIds },
        found: true,
        item: {
          is_active: true,
          category: { in: activeCategories },
          ...(scope.pd2_exclusive === false && { pd2_exclusive: false }),
        },
      },
      select: { grail_id: true, item_id: true, found_at: true },
    });

    // First-finder wins by earliest found_at (null treated as latest)
    const earliestByItem = new Map<string, { user_id: string; found_at: Date }>();
    for (const e of entries) {
      const user_id = grailToUser.get(e.grail_id)!;
      const found_at = e.found_at ?? new Date();
      const prev = earliestByItem.get(e.item_id);
      if (!prev || found_at < prev.found_at) {
        earliestByItem.set(e.item_id, { user_id, found_at });
      }
    }

    console.log(`  ${entries.length} personal entries → ${earliestByItem.size} unique items`);

    let inserted = 0;
    let skipped = 0;
    for (const [item_id, { user_id, found_at }] of earliestByItem) {
      if (dryRun) {
        inserted++;
        continue;
      }
      const result = await db.leagueGrailEntry.upsert({
        where: { league_id_item_id: { league_id: league.id, item_id } },
        update: {}, // first finder keeps credit on re-run
        create: { league_id: league.id, item_id, found_by_user_id: user_id, found_at },
      });
      // Heuristic: if found_at on the existing row matches what we'd have written, count as inserted
      if (result.found_at.getTime() === found_at.getTime() && result.found_by_user_id === user_id) {
        inserted++;
      } else {
        skipped++;
      }
    }

    console.log(`  → inserted ${inserted}, already-present ${skipped}`);
    totalInserted += inserted;
    totalSkipped += skipped;
  }

  console.log(`\n=== TOTAL ===\ninserted: ${totalInserted}\nalready-present: ${totalSkipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
