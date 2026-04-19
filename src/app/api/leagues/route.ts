import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { slugify, generateInviteCode, DEFAULT_GRAIL_SCOPE } from "@/lib/leagues";

const schema = z.object({
  name: z.string().min(2).max(60),
  league_type: z.enum(["cooperative", "competitive", "hybrid"]),
  ladder_mode: z.enum(["softcore_ladder", "hardcore_ladder", "softcore_nonladder", "hardcore_nonladder"]),
  is_private: z.boolean().default(false),
  start_date: z.string().datetime().optional(),
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
});

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

  const season = await db.season.findFirst({ where: { is_current: true } });
  if (!season) {
    return NextResponse.json({ error: "No active season" }, { status: 422 });
  }

  const { name, league_type, ladder_mode, is_private, start_date, end_date, discord_webhook_url, grail_scope } = parsed.data;

  // Generate a unique slug (append suffix if collision)
  let slug = slugify(name);
  const collision = await db.league.findUnique({ where: { slug }, select: { id: true } });
  if (collision) slug = `${slug}-${crypto.randomUUID().slice(0, 4)}`;

  const league = await db.league.create({
    data: {
      name,
      slug,
      commissioner_id: session.user.id,
      season_id: season.id,
      league_type,
      ladder_mode,
      grail_scope: grail_scope ?? DEFAULT_GRAIL_SCOPE,
      is_private,
      invite_code: is_private ? generateInviteCode() : null,
      start_date: start_date ? new Date(start_date) : season.start_date,
      end_date: end_date ? new Date(end_date) : null,
      discord_webhook_url: discord_webhook_url ?? null,
      members: {
        create: { user_id: session.user.id, role: "commissioner" },
      },
    },
    select: { id: true, slug: true, name: true, invite_code: true },
  });

  return NextResponse.json({ league }, { status: 201 });
}
