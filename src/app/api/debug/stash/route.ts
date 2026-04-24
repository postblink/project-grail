import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user.id || !session.user.is_admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await db.account.findFirst({
    where: { userId: session.user.id, provider: "pd2" },
    select: { access_token: true, expires_at: true, providerAccountId: true },
  });

  if (!account) return NextResponse.json({ error: "No PD2 account linked" });

  const nowSecs = Math.floor(Date.now() / 1000);
  const expired = account.expires_at !== null && account.expires_at < nowSecs;

  const res = await fetch(`https://api.projectdiablo2.com/game/stash/${encodeURIComponent(account.providerAccountId)}`, {
    headers: { Authorization: `Bearer ${account.access_token}` },
    cache: "no-store",
  });
  const raw = await res.json();

  return NextResponse.json({
    providerAccountId: account.providerAccountId,
    tokenExpired: expired,
    expires_at: account.expires_at,
    nowSecs,
    stashStatus: res.status,
    topLevelKeys: Object.keys(raw),
    raw,
  });
}
