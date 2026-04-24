import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPD2Token } from "@/lib/pd2-api";

// Temporary debug endpoint — remove after diagnosing stash API shape
export async function GET() {
  const session = await auth();
  if (!session?.user.id || !session.user.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pd2Result = await getPD2Token(session.user.id);
  if (!pd2Result.token) {
    return NextResponse.json({ error: "No PD2 token", needsRelink: pd2Result.needsRelink });
  }

  const methods = ["GET", "POST"] as const;
  const results: Record<string, unknown> = {};

  for (const method of methods) {
    try {
      const res = await fetch("https://api.projectdiablo2.com/game/stash", {
        method,
        headers: { Authorization: `Bearer ${pd2Result.token}` },
      });
      const text = await res.text();
      let body: unknown;
      try { body = JSON.parse(text); } catch { body = text; }
      results[method] = { status: res.status, body };
    } catch (err) {
      results[method] = { error: String(err) };
    }
  }

  return NextResponse.json(results);
}
