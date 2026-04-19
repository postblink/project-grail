/**
 * Contribution scoring for cooperative leagues.
 *
 * Each member earns points for the items they personally find in the shared league grail.
 * Bonus points reward milestones like completing a set or being the first to find a set weapon.
 *
 * Scoring constants are intentionally exposed so they can be surfaced in the UI.
 *
 * TODO(rarity-weight): When item rarity data is available, multiply BASE_ITEM_POINTS by an
 * item-level rarity multiplier (e.g. 1.0 for common, 1.5 for uncommon, 3.0 for ultra-rare).
 * Hook: in computeContributionScores, replace `BASE_ITEM_POINTS` with
 * `BASE_ITEM_POINTS * (item.rarity_weight ?? 1.0)` once the items table carries that column.
 */

import { db } from "@/lib/db";
import type { GrailScope } from "@/lib/leagues";

// ──────────────────────────────────────────────
// Scoring constants
// ──────────────────────────────────────────────

export const SCORING = {
  BASE_ITEM_POINTS: 1,
  FIRST_SET_WEAPON_BONUS: 10,
  SET_COMPLETION_BONUS: 5,
} as const;

/**
 * item_type values (from the PD2 wiki seed) that classify an item as a weapon.
 * Used to determine eligibility for the "first set weapon" bonus.
 */
export const WEAPON_ITEM_TYPES = new Set([
  "axes",
  "bows",
  "class weapons",
  "crossbows",
  "daggers",
  "maces",
  "polearms",
  "scepters",
  "spears",
  "staves",
  "swords",
  "throwing weapons",
  "wands",
  "weapon",
]);

// ──────────────────────────────────────────────
// Output types
// ──────────────────────────────────────────────

export interface BonusBreakdown {
  firstSetWeapon: boolean;   // did this member earn the first-set-weapon bonus?
  setsCompleted: number;     // how many set completions did this member trigger?
}

export interface ContributionScore {
  userId: string;
  displayName: string | null;
  itemsFound: number;
  baseScore: number;
  bonusPoints: number;
  totalScore: number;
  contributionPct: number;    // items found by this member / total found in league
  bonuses: BonusBreakdown;
}

// ──────────────────────────────────────────────
// Scoring engine
// ──────────────────────────────────────────────

export async function computeContributionScores(
  leagueId: string,
  grailScope: GrailScope,
  members: Array<{ user_id: string; user: { display_name: string | null } }>,
): Promise<ContributionScore[]> {
  // Build scope-filtered item ID set
  const activeCategories = (["unique", "set", "runeword", "rune"] as const).filter(
    (cat) => grailScope[cat],
  );

  // Fetch all LeagueGrailEntries with item details, ordered by find time
  const entries = await db.leagueGrailEntry.findMany({
    where: {
      league_id: leagueId,
      item: {
        category: { in: activeCategories },
        is_active: true,
        ...(grailScope.pd2_exclusive === false && { pd2_exclusive: false }),
      },
    },
    include: {
      item: {
        select: { id: true, category: true, item_type: true, set_name: true },
      },
    },
    orderBy: { found_at: "asc" },
  });

  const totalFound = entries.length;

  // Seed score map from member list so members with 0 finds still appear
  const scores = new Map<string, ContributionScore>();
  for (const m of members) {
    scores.set(m.user_id, {
      userId: m.user_id,
      displayName: m.user.display_name,
      itemsFound: 0,
      baseScore: 0,
      bonusPoints: 0,
      totalScore: 0,
      contributionPct: 0,
      bonuses: { firstSetWeapon: false, setsCompleted: 0 },
    });
  }

  // Base score: one point per item found
  // TODO(rarity-weight): replace SCORING.BASE_ITEM_POINTS with
  //   SCORING.BASE_ITEM_POINTS * (entry.item.rarity_weight ?? 1.0)
  for (const entry of entries) {
    const s = scores.get(entry.found_by_user_id);
    if (!s) continue;
    s.itemsFound++;
    s.baseScore += SCORING.BASE_ITEM_POINTS;
  }

  // ── Bonus: first set weapon ──────────────────
  // Awarded once per league to whoever first found a set item with a weapon item_type.
  // entries is already sorted ascending by found_at.
  const firstSetWeaponEntry = entries.find(
    (e) => e.item.category === "set" && WEAPON_ITEM_TYPES.has(e.item.item_type?.toLowerCase() ?? ""),
  );
  if (firstSetWeaponEntry) {
    const s = scores.get(firstSetWeaponEntry.found_by_user_id);
    if (s) {
      s.bonusPoints += SCORING.FIRST_SET_WEAPON_BONUS;
      s.bonuses.firstSetWeapon = true;
    }
  }

  // ── Bonus: set completion ────────────────────
  // Awarded to whoever finds the last item that completes a named set in the league.
  // "Completing a started set, regardless of who started it" — the bonus goes to the
  // member who triggers the completion (latest found_at in the set).
  const setEntries = entries.filter((e) => e.item.category === "set" && e.item.set_name);
  const bySetName = groupBy(setEntries, (e) => e.item.set_name!);

  // We need the full expected size of each set from the DB
  const setNames = [...bySetName.keys()];
  if (setNames.length > 0) {
    const setItemCounts = await db.item.groupBy({
      by: ["set_name"],
      where: {
        set_name: { in: setNames },
        is_active: true,
        ...(grailScope.pd2_exclusive === false && { pd2_exclusive: false }),
      },
      _count: { id: true },
    });
    const expectedSizes = new Map(setItemCounts.map((r) => [r.set_name, r._count.id]));

    for (const [setName, found] of bySetName) {
      const expected = expectedSizes.get(setName) ?? 0;
      if (expected > 0 && found.length >= expected) {
        // Set is complete. The completer is whoever has the latest found_at.
        // found[] is sorted ascending by found_at, so last element is the completer.
        const completer = found[found.length - 1];
        const s = scores.get(completer.found_by_user_id);
        if (s) {
          s.bonusPoints += SCORING.SET_COMPLETION_BONUS;
          s.bonuses.setsCompleted++;
        }
      }
    }
  }

  // Final totals + contribution %
  for (const s of scores.values()) {
    s.totalScore = s.baseScore + s.bonusPoints;
    s.contributionPct =
      totalFound > 0 ? Math.round((s.itemsFound / totalFound) * 100) : 0;
  }

  return [...scores.values()].sort((a, b) => b.totalScore - a.totalScore);
}

// ──────────────────────────────────────────────
// Leaderboard for competitive / hybrid leagues
// ──────────────────────────────────────────────

export interface IndividualRank {
  userId: string;
  displayName: string | null;
  found: number;
  total: number;
  pct: number;
}

export async function computeIndividualRankings(
  members: Array<{ user_id: string; user: { display_name: string | null } }>,
  seasonId: string,
  grailScope: GrailScope,
): Promise<IndividualRank[]> {
  const activeCategories = (["unique", "set", "runeword", "rune"] as const).filter(
    (cat) => grailScope[cat],
  );

  const [grails, totalItems] = await Promise.all([
    db.grail.findMany({
      where: { user_id: { in: members.map((m) => m.user_id) }, season_id: seasonId },
      select: {
        user_id: true,
        entries: {
          where: {
            found: true,
            item: {
              category: { in: activeCategories },
              is_active: true,
              ...(grailScope.pd2_exclusive === false && { pd2_exclusive: false }),
            },
          },
          select: { item_id: true },
        },
      },
    }),
    db.item.count({
      where: {
        is_active: true,
        category: { in: activeCategories },
        ...(grailScope.pd2_exclusive === false && { pd2_exclusive: false }),
      },
    }),
  ]);

  const grailMap = new Map(grails.map((g) => [g.user_id, g.entries.length]));

  return members
    .map((m) => {
      const found = grailMap.get(m.user_id) ?? 0;
      return {
        userId: m.user_id,
        displayName: m.user.display_name,
        found,
        total: totalItems,
        pct: totalItems > 0 ? Math.round((found / totalItems) * 100) : 0,
      };
    })
    .sort((a, b) => b.found - a.found);
}

// ──────────────────────────────────────────────
// Utility
// ──────────────────────────────────────────────

function groupBy<T>(arr: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of arr) {
    const k = key(item);
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return map;
}
