import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPD2Token } from "@/lib/pd2-api";

async function probe(token: string, url: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });
  const body = await res.text().catch(() => "(failed)");
  let parsed: unknown = null;
  try { parsed = JSON.parse(body); } catch { /* not json */ }
  // Truncate large bodies
  const preview = typeof parsed === "object" && parsed !== null
    ? JSON.stringify(parsed).slice(0, 600)
    : String(body).slice(0, 600);
  return { status: res.status, preview };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pd2Result = await getPD2Token(session.user.id);
  if (!pd2Result.token) {
    return NextResponse.json({ error: "No PD2 token", needsRelink: pd2Result.needsRelink });
  }

  const token = pd2Result.token;
  const username = pd2Result.sub;
  const oauthSub = await fetch("https://api.projectdiablo2.com/oauth/me", {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json()).then((d: Record<string, string>) => d.sub ?? null).catch(() => null);

  const urls = [
    `https://api.projectdiablo2.com/game/stash/${username}`,
    `https://api.projectdiablo2.com/game/stash/${oauthSub}`,
    `https://api.projectdiablo2.com/game/stash`,
    `https://api.projectdiablo2.com/game/account/${username}/stash`,
    `https://api.projectdiablo2.com/game/account/${oauthSub}/stash`,
    `https://api.projectdiablo2.com/game/shared-stash/${username}`,
    `https://api.projectdiablo2.com/game/shared-stash/${oauthSub}`,
  ];

  const results: Record<string, unknown> = { username, oauthSub };
  for (const url of urls) {
    results[url] = await probe(token, url);
  }

  return NextResponse.json(results);
}
