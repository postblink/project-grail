import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getMemberRole, isCommissioner, generateInviteCode } from "@/lib/leagues";

const schema = z.object({
  name: z.string().min(2).max(60).optional(),
  is_private: z.boolean().optional(),
  end_date: z.string().datetime().optional().nullable(),
  discord_webhook_url: z.string().url().optional().nullable(),
  grail_scope: z
    .object({
      unique: z.boolean(),
      set: z.boolean(),
      runeword: z.boolean(),
      rune: z.boolean(),
      pd2_exclusive: z.boolean(),
    })
    .optional(),
  regenerate_invite: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const league = await db.league.findUnique({ where: { slug }, select: { id: true, is_private: true } });
  if (!league) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = !!session.user.is_admin;
  if (!isAdmin) {
    const role = await getMemberRole(league.id, session.user.id);
    if (!isCommissioner(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { name, is_private, end_date, discord_webhook_url, grail_scope, regenerate_invite } = parsed.data;

  // If switching to private and has no invite_code yet (or regenerating), create one
  const newInviteCode =
    regenerate_invite || (is_private && !league.is_private)
      ? generateInviteCode()
      : undefined;

  const updated = await db.league.update({
    where: { id: league.id },
    data: {
      ...(name !== undefined && { name }),
      ...(is_private !== undefined && { is_private }),
      ...(end_date !== undefined && { end_date: end_date ? new Date(end_date) : null }),
      ...(discord_webhook_url !== undefined && { discord_webhook_url }),
      ...(grail_scope !== undefined && { grail_scope }),
      ...(newInviteCode !== undefined && { invite_code: newInviteCode }),
    },
    select: { id: true, slug: true, name: true, invite_code: true },
  });

  return NextResponse.json({ league: updated });
}
