import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const schema = z.object({
  grailId: z.string().min(1),
  itemId: z.string().min(1),
  found: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { grailId, itemId, found } = parsed.data;

  // Verify the grail belongs to the requesting user
  const grail = await db.grail.findUnique({
    where: { id: grailId },
    select: { user_id: true, season_id: true },
  });
  if (!grail || grail.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify the item exists
  const item = await db.item.findUnique({ where: { id: itemId }, select: { id: true } });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const entry = await db.grailEntry.upsert({
    where: { grail_id_item_id: { grail_id: grailId, item_id: itemId } },
    update: {
      found,
      found_at: found ? new Date() : null,
      import_source: "manual",
    },
    create: {
      grail_id: grailId,
      item_id: itemId,
      found,
      found_at: found ? new Date() : null,
      import_source: "manual",
    },
  });

  // For hybrid leagues: record first finder in LeagueGrailEntry (best-effort).
  // Only on found=true; unchecking never removes the first-finder record.
  // TODO: armory import bypasses this path — add the same write to the confirm route.
  if (found && grail.season_id) {
    const hybridMemberships = await db.leagueMember.findMany({
      where: {
        user_id: session.user.id,
        league: { season_id: grail.season_id, league_type: "hybrid" },
      },
      select: { league_id: true },
    });

    await Promise.allSettled(
      hybridMemberships.map((m) =>
        db.leagueGrailEntry.upsert({
          where: { league_id_item_id: { league_id: m.league_id, item_id: itemId } },
          update: {},   // no-op — first finder keeps credit
          create: { league_id: m.league_id, item_id: itemId, found_by_user_id: session.user.id },
        }),
      ),
    );
  }

  return NextResponse.json({ entry });
}
