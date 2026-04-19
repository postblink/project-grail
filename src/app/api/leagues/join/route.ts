import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const schema = z.union([
  z.object({ slug: z.string().min(1), invite_code: z.undefined().optional() }),
  z.object({ invite_code: z.string().min(1), slug: z.undefined().optional() }),
]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { slug, invite_code } = parsed.data as { slug?: string; invite_code?: string };

  const league = slug
    ? await db.league.findUnique({ where: { slug }, select: { id: true, slug: true, is_private: true, invite_code: true } })
    : await db.league.findUnique({ where: { invite_code }, select: { id: true, slug: true, is_private: true, invite_code: true } });

  if (!league) {
    return NextResponse.json({ error: "League not found" }, { status: 404 });
  }

  // Public league: joining by slug is fine. Private league: must supply correct invite_code.
  if (league.is_private && invite_code !== league.invite_code) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 403 });
  }

  // Check if already a member
  const existing = await db.leagueMember.findUnique({
    where: { league_id_user_id: { league_id: league.id, user_id: session.user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already a member", slug: league.slug }, { status: 409 });
  }

  await db.leagueMember.create({
    data: { league_id: league.id, user_id: session.user.id, role: "member" },
  });

  return NextResponse.json({ slug: league.slug }, { status: 201 });
}
