import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const schema = z.object({
  grailId: z.string().min(1),
  itemIds: z.array(z.string().min(1)).min(1).max(2000),
  characters: z.array(z.string().min(1)).min(1).max(10),
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

  const { grailId, itemIds, characters } = parsed.data;

  const grail = await db.grail.findUnique({ where: { id: grailId }, select: { user_id: true } });
  if (!grail || grail.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify all submitted itemIds are real active items (prevents injecting arbitrary IDs)
  const validItems = await db.item.findMany({
    where: { id: { in: itemIds }, is_active: true },
    select: { id: true },
  });
  if (validItems.length !== itemIds.length) {
    return NextResponse.json({ error: "One or more item IDs are invalid" }, { status: 400 });
  }

  const now = new Date();

  try {
    const [, armoryImport] = await db.$transaction([
      // Upsert a GrailEntry for every confirmed item
      ...itemIds.map((itemId) =>
        db.grailEntry.upsert({
          where: { grail_id_item_id: { grail_id: grailId, item_id: itemId } },
          update: { found: true, found_at: now, import_source: "armory" },
          create: { grail_id: grailId, item_id: itemId, found: true, found_at: now, import_source: "armory" },
        })
      ),
      // Record the import run
      db.armoryImport.create({
        data: {
          grail_id: grailId,
          user_id: session.user.id,
          characters,
          status: "success",
          items_added: itemIds.length,
        },
      }),
    ]);

    return NextResponse.json({ added: itemIds.length, importId: armoryImport.id });
  } catch (err) {
    // Best-effort: log the failed import run
    await db.armoryImport.create({
      data: {
        grail_id: grailId,
        user_id: session.user.id,
        characters,
        status: "failed",
        items_added: 0,
        error_details: err instanceof Error ? err.message : "Unknown error",
      },
    }).catch(() => {});

    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
