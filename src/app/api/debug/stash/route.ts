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

  const [meRes, stashRes] = await Promise.all([
    fetch("https://api.projectdiablo2.com/oauth/me", {
      headers: { Authorization: `Bearer ${pd2.token}` },
      cache: "no-store",
    }),
    fetch(`https://api.projectdiablo2.com/game/stash/${encodeURIComponent(pd2.sub)}`, {
      headers: { Authorization: `Bearer ${pd2.token}` },
      cache: "no-store",
    }),
  ]);

  const me = await meRes.json();
  const stash = await stashRes.text();

  return NextResponse.json({
    sub: pd2.sub,
    me: { status: meRes.status, body: me },
    stash: { status: stashRes.status, body: JSON.parse(stash) },
  });
}
