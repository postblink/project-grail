import { db } from "@/lib/db";
import { type AchievementDef, getAchievementDef } from "@/lib/achievement-defs";

export type { AchievementDef };
export { getAchievementDef };

const ITEM_MILESTONES: Array<[number, string]> = [
  [1,   "first_item"],
  [10,  "items_10"],
  [50,  "items_50"],
  [100, "items_100"],
  [250, "items_250"],
  [500, "items_500"],
];

const PCT_MILESTONES: Array<[number, string]> = [
  [25,  "milestone_25"],
  [50,  "milestone_50"],
  [75,  "milestone_75"],
  [100, "milestone_100"],
];

// ──────────────────────────────────────────────
// Award logic
// ──────────────────────────────────────────────

interface AwardContext {
  userId: string;
  grailId: string;
  foundCount: number;   // total found after this update
  totalCount: number;   // total items in grail
  item: {
    category: string;
    set_name: string | null;
  };
}

/**
 * Check which achievements the user just became eligible for and award them.
 * Returns the newly unlocked achievement keys (empty if none).
 * Never throws — safe to call fire-and-forget.
 */
export async function awardAchievements(ctx: AwardContext): Promise<string[]> {
  try {
    const { userId, grailId, foundCount, totalCount, item } = ctx;
    const candidates: string[] = [];

    // ── Item count milestones ──────────────────
    for (const [threshold, key] of ITEM_MILESTONES) {
      if (foundCount >= threshold) candidates.push(key);
    }

    // ── Percentage milestones ──────────────────
    if (totalCount > 0) {
      const pct = Math.round((foundCount / totalCount) * 100);
      for (const [threshold, key] of PCT_MILESTONES) {
        if (pct >= threshold) candidates.push(key);
      }
    }

    // ── First rune ─────────────────────────────
    if (item.category === "rune") {
      const runeCount = await db.grailEntry.count({
        where: { grail_id: grailId, found: true, item: { category: "rune" } },
      });
      if (runeCount === 1) candidates.push("first_rune");
    }

    // ── First runeword ─────────────────────────
    if (item.category === "runeword") {
      const rwCount = await db.grailEntry.count({
        where: { grail_id: grailId, found: true, item: { category: "runeword" } },
      });
      if (rwCount === 1) candidates.push("first_runeword");
    }

    // ── Set-item achievements ──────────────────
    if (item.category === "set") {
      const setCount = await db.grailEntry.count({
        where: { grail_id: grailId, found: true, item: { category: "set" } },
      });
      if (setCount === 1) candidates.push("first_set_piece");

      if (item.set_name) {
        const [foundInSet, totalInSet] = await Promise.all([
          db.grailEntry.count({
            where: { grail_id: grailId, found: true, item: { set_name: item.set_name } },
          }),
          db.item.count({ where: { set_name: item.set_name, is_active: true } }),
        ]);

        if (totalInSet > 0 && foundInSet >= totalInSet) {
          candidates.push(`set_complete:${item.set_name}`);

          // first_set_complete — awarded on completing any set for the first time
          // We check this by counting existing set_complete:* achievements before awarding
          const existingSetCompletes = await db.userAchievement.count({
            where: { user_id: userId, key: { startsWith: "set_complete:" } },
          });
          if (existingSetCompletes === 0) candidates.push("first_set_complete");

          // all_sets_complete — check if all sets are now done
          const [totalSets, completedSets] = await Promise.all([
            db.item.groupBy({
              by: ["set_name"],
              where: { category: "set", is_active: true, set_name: { not: null } },
            }),
            db.userAchievement.count({
              where: { user_id: userId, key: { startsWith: "set_complete:" } },
            }),
          ]);
          // +1 because we haven't written set_complete:{this set} yet
          if (completedSets + 1 >= totalSets.length && totalSets.length > 0) {
            candidates.push("all_sets_complete");
          }
        }
      }
    }

    if (candidates.length === 0) return [];

    // Filter to ones not already awarded
    const existing = await db.userAchievement.findMany({
      where: { user_id: userId, key: { in: candidates } },
      select: { key: true },
    });
    const existingKeys = new Set(existing.map((a: { key: string }) => a.key));
    const newKeys = candidates.filter((k) => !existingKeys.has(k));

    if (newKeys.length === 0) return [];

    await db.userAchievement.createMany({
      data: newKeys.map((key: string) => ({ user_id: userId, key })),
      skipDuplicates: true,
    });

    return newKeys;
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────
// Read helpers
// ──────────────────────────────────────────────

export async function getUserAchievements(userId: string) {
  const rows = await db.userAchievement.findMany({
    where: { user_id: userId },
    orderBy: { unlocked_at: "desc" },
  });
  return rows.map((r: { key: string; unlocked_at: Date }) => ({ ...getAchievementDef(r.key), unlockedAt: r.unlocked_at }));
}
