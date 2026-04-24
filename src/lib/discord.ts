import { getAchievementDef } from "@/lib/achievement-defs";

const MILESTONES = [25, 50, 75, 100];

// Achievement keys announced via Discord (set completions only — pct milestones have their own embed)
const ANNOUNCE_ACHIEVEMENTS = new Set([
  "first_set_complete", "all_sets_complete",
]);

export function shouldAnnounceAchievement(key: string): boolean {
  return ANNOUNCE_ACHIEVEMENTS.has(key) || key.startsWith("set_complete:");
}

const CATEGORY_COLORS: Record<string, number> = {
  unique:   0xC7B377, // D2 gold
  set:      0x10B981, // emerald
  runeword: 0xF97316, // orange
  rune:     0xF59E0B, // amber
};

const MILESTONE_COLORS: Record<number, number> = {
  25:  0x22C55E, // green
  50:  0x3B82F6, // blue
  75:  0xF97316, // orange
  100: 0xA855F7, // purple — legendary
};

interface ItemFoundPayload {
  webhookUrl: string;
  displayName: string;
  profileUrl: string;
  itemName: string;
  itemWikiUrl: string | null;
  itemImageUrl: string;
  category: string;
  leagueName: string;
  foundCount: number;
  totalCount: number;
  stats?: string[];
  baseType?: string | null;
  requiredLevel?: number | null;
}

interface MilestonePayload {
  webhookUrl: string;
  displayName: string;
  profileUrl: string;
  milestone: number;
  leagueName: string;
  foundCount: number;
  totalCount: number;
}

export async function notifyItemFound(payload: ItemFoundPayload): Promise<void> {
  const { displayName, profileUrl, itemName, itemWikiUrl, itemImageUrl, category, leagueName, foundCount, totalCount, stats, baseType, requiredLevel } = payload;
  const pct = Math.round((foundCount / totalCount) * 100);
  const itemLink = itemWikiUrl ? `**[${itemName}](${itemWikiUrl})**` : `**${itemName}**`;

  const embed: Record<string, unknown> = {
    color: CATEGORY_COLORS[category] ?? 0x3F3F3F,
    description: `**${displayName}** found ${itemLink}`,
    footer: { text: `${leagueName} · ${foundCount}/${totalCount} (${pct}%)` },
    author: { name: `View ${displayName}'s grail`, url: profileUrl },
  };

  if (itemImageUrl) embed.image = { url: itemImageUrl };

  // Build a compact stats block
  const lines: string[] = [];
  if (baseType) lines.push(`*${baseType}*`);
  if (requiredLevel) lines.push(`Req. Level: ${requiredLevel}`);
  if (stats && stats.length > 0) lines.push(...stats.slice(0, 6));

  if (lines.length > 0) {
    embed.fields = [{ name: "\u200b", value: lines.join("\n"), inline: false }];
  }

  await postWebhook(payload.webhookUrl, { embeds: [embed] });
}

export async function notifyMilestone(payload: MilestonePayload): Promise<void> {
  const { displayName, profileUrl, milestone, leagueName, foundCount, totalCount } = payload;
  const color = MILESTONE_COLORS[milestone] ?? 0xC7B377;
  const emoji = milestone === 100 ? "🏆" : "⚡";

  await postWebhook(payload.webhookUrl, {
    embeds: [{
      color,
      title: `${emoji} ${milestone}% Grail Complete!`,
      url: profileUrl,
      description: `**${displayName}** has reached **${milestone}%** of the Holy Grail`,
      footer: { text: `${leagueName} · ${foundCount}/${totalCount} items` },
    }],
  });
}

export function checkMilestoneCrossed(prevFound: number, newFound: number, total: number): number | null {
  if (total === 0) return null;
  const prevPct = (prevFound / total) * 100;
  const newPct = (newFound / total) * 100;
  for (const m of MILESTONES) {
    if (prevPct < m && newPct >= m) return m;
  }
  return null;
}

interface AchievementPayload {
  webhookUrl: string;
  displayName: string;
  profileUrl: string;
  achievementName: string;
  achievementDescription: string;
  achievementEmoji: string;
  leagueName: string;
}

export async function notifyAchievementUnlocked(payload: AchievementPayload): Promise<void> {
  await postWebhook(payload.webhookUrl, {
    embeds: [{
      color: 0xF59E0B,
      title: `${payload.achievementEmoji} Achievement Unlocked`,
      url: payload.profileUrl,
      description: `**${payload.displayName}** unlocked **${payload.achievementName}**`,
      fields: [{ name: "\u200b", value: payload.achievementDescription, inline: false }],
      footer: { text: payload.leagueName },
    }],
  });
}

export interface BatchPayload {
  webhookUrl: string;
  displayName: string;
  profileUrl: string;
  leagueNames: string[];
  itemsFound: number;
  itemNames: string[];
  pctBefore: number;
  pctCurrent: number;
  foundCurrent: number;
  total: number;
  milestones: number[];
  achievementKeys: string[];
}

const ITEM_LIST_LIMIT = 8;

export async function sendBatchNotification(payload: BatchPayload): Promise<void> {
  const { displayName, profileUrl, leagueNames, itemsFound, itemNames, pctBefore, pctCurrent, foundCurrent, total, milestones, achievementKeys } = payload;

  const highestMilestone = milestones.length > 0 ? Math.max(...milestones) : null;
  const color = highestMilestone !== null ? (MILESTONE_COLORS[highestMilestone] ?? 0xC7B377) : 0xC7B377;

  const pctChange = pctBefore !== pctCurrent ? ` (${pctBefore}% → ${pctCurrent}%)` : ` (${pctCurrent}%)`;
  const itemsLine = `**${displayName}** found **${itemsFound}** item${itemsFound !== 1 ? "s" : ""}${pctChange}`;

  // Item name list
  let itemListStr = "";
  if (itemNames.length > 0) {
    const shown = itemNames.slice(0, ITEM_LIST_LIMIT);
    const rest = itemNames.length - shown.length;
    itemListStr = shown.join(", ") + (rest > 0 ? ` +${rest} more` : "");
  }

  // Milestone / achievement highlights
  const highlights: string[] = [];
  for (const m of milestones) {
    highlights.push(`${m === 100 ? "🏆" : "⚡"} ${m}% milestone reached`);
  }
  for (const key of achievementKeys) {
    const def = getAchievementDef(key);
    highlights.push(`${def.emoji} ${def.name}`);
  }

  let description = itemsLine;
  if (itemListStr) description += `\n${itemListStr}`;
  if (highlights.length === 1) {
    description += `\n${highlights[0]}`;
  } else if (highlights.length === 2) {
    description += `\n${highlights[0]} · ${highlights[1]}`;
  } else if (highlights.length > 2) {
    description += `\n${highlights[0]} · ${highlights[1]} · +${highlights.length - 2} more`;
  }

  const leagueLabel = leagueNames.length === 1
    ? leagueNames[0]
    : leagueNames.length <= 3
    ? leagueNames.join(", ")
    : `${leagueNames.slice(0, 2).join(", ")} +${leagueNames.length - 2} more`;

  await postWebhook(payload.webhookUrl, {
    embeds: [{
      color,
      description,
      url: profileUrl,
      author: { name: `View ${displayName}'s grail`, url: profileUrl },
      footer: { text: `${leagueLabel} · ${foundCurrent}/${total} items` },
    }],
  });
}

async function postWebhook(url: string, body: object): Promise<void> {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
