import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPD2Token } from "@/lib/pd2-api";

export async function GET() {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pd2Result = await getPD2Token(session.user.id);

  if (!pd2Result.token) {
    return NextResponse.json({
      hasToken: false,
      needsRelink: pd2Result.needsRelink,
    });
  }

  // First, fetch full /oauth/me to see all available fields
  const meRes = await fetch("https://api.projectdiablo2.com/oauth/me", {
    headers: { Authorization: `Bearer ${pd2Result.token}` },
    cache: "no-store",
  });
  const meBody = await meRes.json().catch(() => null);

  const sub = pd2Result.sub;
  const name = (meBody as { name?: string })?.name ?? null;

  // Test both sub and name to find the correct identifier
  const urlBySub = `https://api.projectdiablo2.com/game/stash/${encodeURIComponent(sub)}`;
  const urlByName = name ? `https://api.projectdiablo2.com/game/stash/${encodeURIComponent(name)}` : null;

  const [resBySub, resByName] = await Promise.all([
    fetch(urlBySub, { headers: { Authorization: `Bearer ${pd2Result.token}` }, cache: "no-store" }),
    urlByName ? fetch(urlByName, { headers: { Authorization: `Bearer ${pd2Result.token}` }, cache: "no-store" }) : Promise.resolve(null),
  ]);

  return NextResponse.json({
    hasToken: true,
    sub,
    name,
    bySub: { url: urlBySub, status: resBySub.status, body: await resBySub.text() },
    byName: urlByName && resByName ? { url: urlByName, status: resByName.status, body: await resByName.text() } : null,
  });
}
