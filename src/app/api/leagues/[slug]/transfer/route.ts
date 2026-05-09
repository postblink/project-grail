import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const schema = z.object({ to_user_id: z.string().min(1) });

/**
 * POST /api/leagues/[slug]/transfer
 *
 * Hand the commissioner role to another member. Authorized actors: the current
 * commissioner or a site admin. Target must already be a member of the league.
 *
 * After transfer:
 * - target.role = "commissioner", league.commissioner_id = target
 * - previous commissioner.role = "co_commissioner" (kept around so they can
 *   still manage if needed; they can leave the league afterward)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const league = await db.league.findUnique({
    where: { slug },
    select: { id: true, commissioner_id: true },
  });
  if (!league) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = !!session.user.is_admin;
  const isCommissioner = session.user.id === league.commissioner_id;
  if (!isAdmin && !isCommissioner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { to_user_id } = parsed.data;
  if (to_user_id === league.commissioner_id) {
    return NextResponse.json({ error: "Already commissioner" }, { status: 400 });
  }

  const target = await db.leagueMember.findUnique({
    where: { league_id_user_id: { league_id: league.id, user_id: to_user_id } },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json({ error: "Target is not a league member" }, { status: 422 });
  }

  await db.$transaction([
    db.leagueMember.update({
      where: { league_id_user_id: { league_id: league.id, user_id: to_user_id } },
      data: { role: "commissioner" },
    }),
    db.leagueMember.update({
      where: { league_id_user_id: { league_id: league.id, user_id: league.commissioner_id } },
      data: { role: "co_commissioner" },
    }),
    db.league.update({
      where: { id: league.id },
      data: { commissioner_id: to_user_id },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
