import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find current season
  const season = await db.season.findFirst({ where: { is_current: true } });

  // Find leagues for this user with webhooks
  const leagues = await db.league.findMany({
    where: { members: { some: { user_id: session.user.id } } },
    select: {
      id: true,
      name: true,
      season_id: true,
      discord_webhook_url: true,
    },
  });

  // Find current grail
  const grail = season
    ? await db.grail.findFirst({
        where: { user_id: session.user.id, season_id: season.id },
        select: { id: true, season_id: true },
      })
    : null;

  // Try sending a test webhook to the first league that has one
  const leagueWithWebhook = leagues.find((l) => l.discord_webhook_url);
  let webhookResult: unknown = "no league with webhook found";
  if (leagueWithWebhook?.discord_webhook_url) {
    try {
      const res = await fetch(leagueWithWebhook.discord_webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "🔧 pd2grail Discord debug test" }),
      });
      webhookResult = { status: res.status, ok: res.ok, body: await res.text() };
    } catch (e) {
      webhookResult = { error: String(e) };
    }
  }

  return NextResponse.json({
    userId: session.user.id,
    currentSeason: season ? { id: season.id, name: season.name } : null,
    grail: grail ? { id: grail.id, season_id: grail.season_id } : null,
    leagues: leagues.map((l) => ({
      id: l.id,
      name: l.name,
      season_id: l.season_id,
      hasWebhook: !!l.discord_webhook_url,
      webhookSnippet: l.discord_webhook_url?.slice(0, 40) ?? null,
    })),
    webhookTest: webhookResult,
  });
}
