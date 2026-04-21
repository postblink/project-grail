import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendBatchNotification } from "@/lib/discord";

export async function GET(req: NextRequest) {
  // Caller must supply CRON_SECRET via Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const batches = await db.discordBatch.findMany({
    where: { flush_after: { lte: now } },
    include: { league: { select: { name: true, discord_webhook_url: true } } },
  });

  if (batches.length === 0) {
    return NextResponse.json({ flushed: 0 });
  }

  const results = await Promise.allSettled(
    batches.map(async (batch) => {
      // items_found=0 means this is a sentinel from a single immediate send — nothing more arrived, skip
      if (batch.items_found === 0) {
        await db.discordBatch.delete({ where: { id: batch.id } });
        return;
      }

      const webhookUrl = batch.league.discord_webhook_url;
      if (!webhookUrl) {
        await db.discordBatch.delete({ where: { id: batch.id } });
        return;
      }

      await sendBatchNotification({
        webhookUrl,
        displayName: batch.display_name,
        profileUrl: batch.profile_url,
        leagueName: batch.league.name,
        itemsFound: batch.items_found,
        pctBefore: batch.pct_before,
        pctCurrent: batch.pct_current,
        foundCurrent: batch.found_current,
        total: batch.total,
        milestones: batch.milestones,
        achievementKeys: batch.achievement_keys,
      });

      await db.discordBatch.delete({ where: { id: batch.id } });
    }),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  return NextResponse.json({ flushed: batches.length - failed, failed });
}
