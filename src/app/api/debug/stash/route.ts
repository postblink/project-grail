import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPD2Token } from "@/lib/pd2-api";

export async function GET() {
  const session = await auth();
  if (!session?.user.id || !session.user.is_admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pd2 = await getPD2Token(session.user.id);
  if (!pd2.token) return NextResponse.json({ error: "No PD2 token", needsRelink: pd2.needsRelink });

  const meRes = await fetch("https://api.projectdiablo2.com/oauth/me", {
    headers: { Authorization: `Bearer ${pd2.token}` },
    cache: "no-store",
  });
  const me = await meRes.json() as { sub?: string; name?: string };

  const byName = await fetch(`https://api.projectdiablo2.com/game/stash/${encodeURIComponent(me.name ?? "")}`, {
    headers: { Authorization: `Bearer ${pd2.token}` },
    cache: "no-store",
  });
  const bySub = await fetch(`https://api.projectdiablo2.com/game/stash/${encodeURIComponent(me.sub ?? "")}`, {
    headers: { Authorization: `Bearer ${pd2.token}` },
    cache: "no-store",
  });

  return NextResponse.json({
    me,
    byName: { status: byName.status, body: await byName.json() },
    bySub: { status: bySub.status, body: await bySub.json() },
  });
}
