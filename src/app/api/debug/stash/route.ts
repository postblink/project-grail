import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPD2Token } from "@/lib/pd2-api";

export async function GET() {
  const session = await auth();
  if (!session?.user?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pd2Result = await getPD2Token(session.user.id);
  if (!pd2Result.token) {
    return NextResponse.json({ error: "No PD2 token", needsRelink: pd2Result.needsRelink });
  }

  const url = `https://api.projectdiablo2.com/game/stash/${encodeURIComponent(pd2Result.sub)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${pd2Result.token}` },
    next: { revalidate: 0 },
  });

  const body = await res.text().catch(() => "(failed to read body)");
  let parsed: unknown = null;
  try { parsed = JSON.parse(body); } catch { /* not json */ }

  return NextResponse.json({
    sub: pd2Result.sub,
    status: res.status,
    ok: res.ok,
    raw: parsed ?? body,
  });
}
