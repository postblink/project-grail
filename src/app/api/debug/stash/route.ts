import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getPD2Token } from "@/lib/pd2-api";

// Temporary debug endpoint — remove after diagnosing stash API shape
export async function GET() {
  const session = await auth();
  if (!session?.user.id || !session.user.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pd2Result = await getPD2Token(session.user.id);
  if (!pd2Result.token) {
    return NextResponse.json({ error: "No PD2 token", needsRelink: pd2Result.needsRelink });
  }

  // Get the stored PD2 sub (providerAccountId)
  const account = await db.account.findFirst({
    where: { userId: session.user.id, provider: "pd2" },
    select: { providerAccountId: true },
  });
  const sub = account?.providerAccountId;

  const urls = [
    `https://api.projectdiablo2.com/game/stash/${sub}`,
    `https://api.projectdiablo2.com/game/account/${sub}`,
    `https://api.projectdiablo2.com/game/account/me`,
    `https://api.projectdiablo2.com/game/stash/me`,
  ];

  const results: Record<string, unknown> = { sub };

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${pd2Result.token}` },
      });
      const text = await res.text();
      let body: unknown;
      try { body = JSON.parse(text); } catch { body = text; }
      results[url] = { status: res.status, body };
    } catch (err) {
      results[url] = { error: String(err) };
    }
  }

  return NextResponse.json(results);
}
