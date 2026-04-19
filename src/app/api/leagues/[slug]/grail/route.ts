import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getMemberRole } from "@/lib/leagues";

const schema = z.object({
  itemId: z.string().min(1),
  found: z.boolean(),
});

/**
 * PATCH /api/leagues/[slug]/grail
 * Toggle an item found/unfound in a cooperative league's shared grail.
 * Uses LeagueGrailEntry as source of truth (not individual GrailEntry records).
 * Only valid for leagues with league_type = "cooperative".
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const league = await db.league.findUnique({
    where: { slug },
    select: { id: true, league_type: true },
  });
  if (!league) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (league.league_type !== "cooperative") {
    return NextResponse.json({ error: "Only cooperative leagues use this endpoint" }, { status: 422 });
  }

  const role = await getMemberRole(league.id, session.user.id);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { itemId, found } = parsed.data;

  // Verify item exists and is active
  const item = await db.item.findUnique({ where: { id: itemId, is_active: true }, select: { id: true } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  if (found) {
    const entry = await db.leagueGrailEntry.upsert({
      where: { league_id_item_id: { league_id: league.id, item_id: itemId } },
      update: {},  // already found — no-op (first finder keeps credit)
      create: { league_id: league.id, item_id: itemId, found_by_user_id: session.user.id },
    });
    return NextResponse.json({ entry });
  } else {
    await db.leagueGrailEntry.deleteMany({
      where: { league_id: league.id, item_id: itemId },
    });
    return NextResponse.json({ entry: null });
  }
}
