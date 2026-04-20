const MILESTONES = [25, 50, 75, 100];

// Achievement keys announced via Discord (set completions only — pct milestones have their own embed)
const ANNOUNCE_ACHIEVEMENTS = new Set([
  "first_set_complete", "all_sets_complete",
]);

export function shouldAnnounceAchievement(key: string): boolean {
  return ANNOUNCE_ACHIEVEMENTS.has(key) || key.startsWith("set_complete:");
}

const MILESTONE_COLORS: Record<number, number> = {
  25:  0xC7B377, // D2 gold
  50:  0xF59E0B, // amber
  75:  0xEF4444, // red
  100: 0xA855F7, // purple — legendary
};

interface ItemFoundPayload {
  webhookUrl: string;
  displayName: string;
  itemName: string;
  leagueName: string;
  foundCount: number;
  totalCount: number;
}

interface MilestonePayload {
  webhookUrl: string;
  displayName: string;
  milestone: number;
  leagueName: string;
  foundCount: number;
  totalCount: number;
}

export async function notifyItemFound(payload: ItemFoundPayload): Promise<void> {
  const pct = Math.round((payload.foundCount / payload.totalCount) * 100);
  await postWebhook(payload.webhookUrl, {
    embeds: [{
      color: 0x3F3F3F,
      description: `**${payload.displayName}** found **${payload.itemName}**`,
      footer: { text: `${payload.leagueName} · ${payload.foundCount}/${payload.totalCount} (${pct}%)` },
    }],
  });
}

export async function notifyMilestone(payload: MilestonePayload): Promise<void> {
  const color = MILESTONE_COLORS[payload.milestone] ?? 0xC7B377;
  const emoji = payload.milestone === 100 ? "🏆" : "⚡";
  await postWebhook(payload.webhookUrl, {
    embeds: [{
      color,
      title: `${emoji} ${payload.milestone}% Grail Complete!`,
      description: `**${payload.displayName}** has reached **${payload.milestone}%** of the Holy Grail`,
      footer: { text: `${payload.leagueName} · ${payload.foundCount}/${payload.totalCount} items` },
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
  achievementName: string;
  achievementDescription: string;
  achievementEmoji: string;
  leagueName: string;
}

export async function notifyAchievementUnlocked(payload: AchievementPayload): Promise<void> {
  await postWebhook(payload.webhookUrl, {
    embeds: [{
      color: 0xF59E0B, // amber — consistent with achievement UI
      title: `${payload.achievementEmoji} Achievement Unlocked`,
      description: `**${payload.displayName}** unlocked **${payload.achievementName}**`,
      fields: [{ name: "\u200b", value: payload.achievementDescription, inline: false }],
      footer: { text: payload.leagueName },
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
