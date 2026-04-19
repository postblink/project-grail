import { db } from "@/lib/db";

// ──────────────────────────────────────────────
// Achievement definitions
// ──────────────────────────────────────────────

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  emoji: string;
  color: string; // tailwind text color class
}

const ITEM_MILESTONES: Array<[number, string, string, string]> = [
  [1,   "first_item",  "First Find",       "Found your very first item."],
  [10,  "items_10",   "Getting Started",   "Found 10 items."],
  [50,  "items_50",   "Seasoned Hunter",   "Found 50 items."],
  [100, "items_100",  "Grail Initiate",    "Found 100 items."],
  [250, "items_250",  "Item Collector",    "Found 250 items."],
  [500, "items_500",  "Veteran Hunter",    "Found 500 items."],
];

const PCT_MILESTONES: Array<[number, string, string, string]> = [
  [25,  "milestone_25",  "Quarter Quest",   "Reached 25% completion."],
  [50,  "milestone_50",  "Halfway There",   "Reached 50% completion."],
  [75,  "milestone_75",  "Almost There",    "Reached 75% completion."],
  [100, "milestone_100", "The Holy Grail",  "Found every item. The Grail is yours."],
];

// Static achievements (key, name, description, emoji, color)
const STATIC: AchievementDef[] = [
  { key: "first_item",     name: "First Find",       description: "Found your very first item.",             emoji: "✦",  color: "text-zinc-300" },
  { key: "items_10",       name: "Getting Started",  description: "Found 10 items.",                         emoji: "⚔",  color: "text-zinc-400" },
  { key: "items_50",       name: "Seasoned Hunter",  description: "Found 50 items.",                         emoji: "🗡",  color: "text-zinc-300" },
  { key: "items_100",      name: "Grail Initiate",   description: "Found 100 items.",                        emoji: "⚗",  color: "text-amber-400" },
  { key: "items_250",      name: "Item Collector",   description: "Found 250 items.",                        emoji: "💎",  color: "text-amber-400" },
  { key: "items_500",      name: "Veteran Hunter",   description: "Found 500 items.",                        emoji: "👑",  color: "text-amber-300" },
  { key: "milestone_25",   name: "Quarter Quest",    description: "Reached 25% completion.",                 emoji: "◈",  color: "text-zinc-400" },
  { key: "milestone_50",   name: "Halfway There",    description: "Reached 50% completion.",                 emoji: "◈",  color: "text-amber-500" },
  { key: "milestone_75",   name: "Almost There",     description: "Reached 75% completion.",                 emoji: "◈",  color: "text-amber-400" },
  { key: "milestone_100",  name: "The Holy Grail",   description: "Found every item. The Grail is yours.",   emoji: "⚗",  color: "text-amber-300" },
  { key: "first_rune",     name: "The Alphabet",     description: "Found your first rune.",                  emoji: "ᚱ",  color: "text-violet-400" },
  { key: "first_set_piece",name: "Set Collector",    description: "Found your first set item.",              emoji: "◆",  color: "text-emerald-400" },
  { key: "first_set_complete", name: "Set Master",   description: "Completed your first full item set.",     emoji: "◆◆", color: "text-emerald-400" },
  { key: "all_sets_complete",  name: "Set Grandmaster", description: "Completed every item set.",            emoji: "◆◆◆", color: "text-emerald-300" },
  { key: "first_runeword", name: "Word of Power",    description: "Found your first runeword.",              emoji: "ᚹ",  color: "text-orange-400" },
];

export function getAchievementDef(key: string): AchievementDef {
  const static_ = STATIC.find((a) => a.key === key);
  if (static_) return static_;

  // Dynamic: set_complete:{setName}
  if (key.startsWith("set_complete:")) {
    const setName = key.slice("set_complete:".length);
    return {
      key,
      name: `${setName} Complete`,
      description: `Completed the full ${setName} item set.`,
      emoji: "◆",
      color: "text-emerald-400",
    };
  }

  return { key, name: key, description: "", emoji: "✦", color: "text-zinc-500" };
}

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
