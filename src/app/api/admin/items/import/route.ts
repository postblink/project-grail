import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const itemSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["unique", "set", "runeword", "rune", "other"]),
  item_type: z.string().optional().nullable(),
  set_name: z.string().optional().nullable(),
  pd2_exclusive: z.boolean().default(false),
  is_active: z.boolean().default(true),
  wiki_url: z.string().url().optional().nullable(),
  season_introduced: z.string().optional().nullable(), // season slug
});

const bodySchema = z.array(itemSchema).min(1).max(2000);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const items = parsed.data;

  // Resolve season slugs to IDs in one query
  const slugs = [...new Set(items.map((i) => i.season_introduced).filter(Boolean))] as string[];
  const seasons = slugs.length
    ? await db.season.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } })
    : [];
  const seasonMap = new Map(seasons.map((s) => [s.slug, s.id]));

  let created = 0;
  let updated = 0;

  await Promise.all(
    items.map(async (item) => {
      const seasonId = item.season_introduced ? (seasonMap.get(item.season_introduced) ?? null) : null;

      const existing = await db.item.findUnique({ where: { name: item.name }, select: { id: true } });

      if (existing) {
        await db.item.update({
          where: { id: existing.id },
          data: {
            category: item.category,
            item_type: item.item_type ?? null,
            set_name: item.set_name ?? null,
            pd2_exclusive: item.pd2_exclusive,
            is_active: item.is_active,
            wiki_url: item.wiki_url ?? null,
            season_introduced_id: seasonId,
          },
        });
        updated++;
      } else {
        await db.item.create({
          data: {
            name: item.name,
            category: item.category,
            item_type: item.item_type ?? null,
            set_name: item.set_name ?? null,
            pd2_exclusive: item.pd2_exclusive,
            is_active: item.is_active,
            wiki_url: item.wiki_url ?? null,
            season_introduced_id: seasonId,
          },
        });
        created++;
      }
    }),
  );

  return NextResponse.json({ created, updated, total: items.length });
}
