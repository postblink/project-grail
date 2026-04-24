import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPD2Token } from "@/lib/pd2-api";

export async function GET() {
  const session = await auth();
  if (!session?.user.id || !session.user.is_admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pd2 = await getPD2Token(session.user.id);
  if (!pd2.token) return NextResponse.json({ error: "No PD2 token" });

  const res = await fetch(`https://api.projectdiablo2.com/game/stash/${encodeURIComponent(pd2.sub)}`, {
    headers: { Authorization: `Bearer ${pd2.token}` },
    cache: "no-store",
  });
  const raw = await res.json();
  return NextResponse.json({ status: res.status, topLevelKeys: Object.keys(raw), raw });
}
