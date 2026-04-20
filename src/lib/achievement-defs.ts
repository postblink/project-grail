// Pure achievement definitions — no DB, safe to import in client components.

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  emoji: string;
  color: string; // tailwind text color class
}

// All static (non-dynamic) achievements ordered for the gallery
export const ALL_ACHIEVEMENT_DEFS: AchievementDef[] = [
  { key: "first_item",         name: "First Find",        description: "Found your very first item.",           emoji: "✦",   color: "text-zinc-300" },
  { key: "items_10",           name: "Getting Started",   description: "Found 10 items.",                       emoji: "⚔",   color: "text-zinc-400" },
  { key: "items_50",           name: "Seasoned Hunter",   description: "Found 50 items.",                       emoji: "🗡",   color: "text-zinc-300" },
  { key: "items_100",          name: "Grail Initiate",    description: "Found 100 items.",                      emoji: "⚗",   color: "text-amber-400" },
  { key: "items_250",          name: "Item Collector",    description: "Found 250 items.",                      emoji: "💎",   color: "text-amber-400" },
  { key: "items_500",          name: "Veteran Hunter",    description: "Found 500 items.",                      emoji: "👑",   color: "text-amber-300" },
  { key: "milestone_25",       name: "Quarter Quest",     description: "Reached 25% completion.",               emoji: "◈",   color: "text-zinc-400" },
  { key: "milestone_50",       name: "Halfway There",     description: "Reached 50% completion.",               emoji: "◈",   color: "text-amber-500" },
  { key: "milestone_75",       name: "Almost There",      description: "Reached 75% completion.",               emoji: "◈",   color: "text-amber-400" },
  { key: "milestone_100",      name: "The Holy Grail",    description: "Found every item. The Grail is yours.", emoji: "⚗",   color: "text-amber-300" },
  { key: "first_rune",         name: "The Alphabet",      description: "Found your first rune.",                emoji: "ᚱ",   color: "text-violet-400" },
  { key: "first_runeword",     name: "Word of Power",     description: "Found your first runeword.",            emoji: "ᚹ",   color: "text-orange-400" },
  { key: "first_set_piece",    name: "Set Collector",     description: "Found your first set item.",            emoji: "◆",   color: "text-emerald-400" },
  { key: "first_set_complete", name: "Set Master",        description: "Completed your first full item set.",   emoji: "◆◆",  color: "text-emerald-400" },
  { key: "all_sets_complete",  name: "Set Grandmaster",   description: "Completed every item set.",             emoji: "◆◆◆", color: "text-emerald-300" },
];

export function getAchievementDef(key: string): AchievementDef {
  const found = ALL_ACHIEVEMENT_DEFS.find((a) => a.key === key);
  if (found) return found;

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
