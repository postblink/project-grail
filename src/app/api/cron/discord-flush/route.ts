import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendBatchNotification } from "@/lib/discord";
import { wikiImageUrl } from "@/lib/grail";

interface BatchRow {
  id: string;
  user_id: string;
  display_name: string;
  profile_url: string;
  items_found: number;
  item_names: string[];
  pct_before: number;
  pct_current: number;
  found_current: number;
  total: number;
  milestones: number[];
  achievement_keys: string[];
  flush_after: Date;
  league: { name: string; discord_webhook_url: string | null };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET?.trim()}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const batches = (await (db.discordBatch as any).findMany({
    where: { flush_after: { lte: now } },
    include: { league: { select: { name: true, discord_webhook_url: true } } },
  })) as BatchRow[];

  if (batches.length === 0) {
    return NextResponse.json({ flushed: 0 });
  }

  // Group by (user_id, webhook_url) so multiple leagues sharing the same webhook
  // don't spam the channel with identical messages — one message per webhook.
  const groups = new Map<string, BatchRow[]>();
  for (const batch of batches) {
    const webhook = batch.league.discord_webhook_url;
    if (!webhook) continue;
    const key = `${batch.user_id}::${webhook}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(batch);
  }

  const results = await Promise.allSettled(
    [...groups.values()].map(async (group) => {
      const webhookUrl = group[0].league.discord_webhook_url!;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db.discordBatch as any).deleteMany({ where: { id: { in: group.map((b) => b.id) } } });

      const realBatches = group.filter((b) => b.items_found > 0);
      if (realBatches.length === 0) return; // all sentinels — nothing to send

      const primary = realBatches.reduce((a, b) => a.items_found >= b.items_found ? a : b);
      const leagueNames = [...new Set(group.map((b) => b.league.name))];
      const itemNames = [...new Set(realBatches.flatMap((b) => b.item_names))];
      const milestones = [...new Set(realBatches.flatMap((b) => b.milestones))];
      const achievementKeys = [...new Set(realBatches.flatMap((b) => b.achievement_keys))];

      // Resolve thumbnail from first item name
      let thumbnailUrl: string | undefined;
      if (itemNames[0]) {
        const firstItem = await db.item.findFirst({
          where: { name: { equals: itemNames[0], mode: "insensitive" } },
          select: { category: true },
        });
        if (firstItem) thumbnailUrl = wikiImageUrl(itemNames[0], firstItem.category) || undefined;
      }

      await sendBatchNotification({
        webhookUrl,
        displayName: primary.display_name,
        profileUrl: primary.profile_url,
        leagueNames,
        itemsFound: primary.items_found,
        itemNames,
        pctBefore: primary.pct_before,
        pctCurrent: primary.pct_current,
        foundCurrent: primary.found_current,
        total: primary.total,
        milestones,
        achievementKeys,
        thumbnailUrl,
      });
    }),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  return NextResponse.json({ flushed: groups.size - failed, failed });
}
