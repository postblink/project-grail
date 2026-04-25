import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPD2Token } from "@/lib/pd2-api";

async function tryStash(token: string, id: string) {
  const url = `https://api.projectdiablo2.com/game/stash/${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });
  const body = await res.text().catch(() => "(failed to read body)");
  let parsed: unknown = null;
  try { parsed = JSON.parse(body); } catch { /* not json */ }
  return { url, status: res.status, ok: res.ok, body: parsed ?? body };
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

  // Get the raw OAuth identity — may return both sub (account ID) and name
  const meRes = await fetch("https://api.projectdiablo2.com/oauth/me", {
    headers: { Authorization: `Bearer ${pd2Result.token}` },
  });
  const meBody = await meRes.json().catch(() => null) as Record<string, unknown> | null;

  const results: Record<string, unknown> = {
    storedSub: pd2Result.sub,
    oauthMe: { status: meRes.status, body: meBody },
  };

  // Try stash with stored sub (username)
  results.byUsername = await tryStash(pd2Result.token, pd2Result.sub);

  // If /oauth/me returned a different sub, try that too
  const oauthSub = meBody?.sub as string | undefined;
  if (oauthSub && oauthSub !== pd2Result.sub) {
    results.byOAuthSub = await tryStash(pd2Result.token, oauthSub);
  }

  return NextResponse.json(results);
}
