import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/leagues";

const schema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(40).optional(),
  start_date: z.string().date(),
  end_date: z.string().date().optional().nullable(),
  is_current: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { name, start_date, end_date, is_current } = parsed.data;
  const slug = parsed.data.slug ?? slugify(name);

  const existing = await db.season.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "Slug already taken", code: "SLUG_CONFLICT" }, { status: 409 });
  }

  const season = await db.$transaction(async (tx) => {
    if (is_current) {
      await tx.season.updateMany({ data: { is_current: false } });
    }
    return tx.season.create({
      data: {
        name,
        slug,
        start_date: new Date(start_date),
        end_date: end_date ? new Date(end_date) : null,
        is_current,
      },
    });
  });

  return NextResponse.json({ season }, { status: 201 });
}
