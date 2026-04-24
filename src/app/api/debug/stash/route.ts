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
  const name = me.name ?? "";
  const sub = me.sub ?? "";

  const paths = [
    `game/materials/${name}`,
    `game/materials/${sub}`,
    `game/account/${name}/materials`,
    `game/account/${sub}/materials`,
    `game/stash/${name}/materials`,
    `game/character-stash/${name}`,
    `game/shared/${name}`,
    `game/storage/${name}`,
  ];

  const results: Record<string, { status: number; body: unknown }> = {};
  await Promise.all(paths.map(async (path) => {
    const res = await fetch(`https://api.projectdiablo2.com/${path}`, {
      headers: { Authorization: `Bearer ${pd2.token!}` },
      cache: "no-store",
    });
    const body = await res.text();
    results[path] = { status: res.status, body: JSON.parse(body) };
  }));

  return NextResponse.json({ me, results });
}
