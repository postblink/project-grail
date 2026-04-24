import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPD2Token } from "@/lib/pd2-api";

export async function GET() {
  const session = await auth();
  if (!session?.user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const pd2Result = await getPD2Token(session.user.id);
  if (!pd2Result.token) return NextResponse.json({ hasToken: false });

  const name = pd2Result.sub; // now stored as username
  const headers = { Authorization: `Bearer ${pd2Result.token}` };

  const candidates = [
    `https://api.projectdiablo2.com/game/account/${encodeURIComponent(name)}`,
    `https://api.projectdiablo2.com/game/account/${encodeURIComponent(name)}/characters`,
    `https://api.projectdiablo2.com/game/character?owner=${encodeURIComponent(name)}`,
    `https://api.projectdiablo2.com/game/characters?owner=${encodeURIComponent(name)}`,
    `https://api.projectdiablo2.com/game/ladder/character?account=${encodeURIComponent(name)}`,
  ];

  const results = await Promise.all(
    candidates.map(async (url) => {
      const res = await fetch(url, { headers, cache: "no-store" });
      const body = await res.text();
      return { url, status: res.status, body: body.slice(0, 300) };
    }),
  );

  return NextResponse.json({ name, results });
}
