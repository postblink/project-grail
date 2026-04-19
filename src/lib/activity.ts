import { db } from "@/lib/db";

export interface ActivityEvent {
  id: string;
  userId: string;
  displayName: string | null;
  itemName: string;
  itemCategory: string;
  itemType: string | null;
  foundAt: Date;
}

export async function getLeagueActivity(
  league: {
    id: string;
    season_id: string;
    league_type: string;
    members: Array<{ user_id: string }>;
  },
  limit = 50,
): Promise<ActivityEvent[]> {
  if (league.league_type === "cooperative") {
    const entries = await db.leagueGrailEntry.findMany({
      where: { league_id: league.id },
      include: {
        item: { select: { name: true, category: true, item_type: true } },
        found_by: { select: { id: true, display_name: true } },
      },
      orderBy: { found_at: "desc" },
      take: limit,
    });

    return entries.map((e) => ({
      id: e.id,
      userId: e.found_by_user_id,
      displayName: e.found_by.display_name,
      itemName: e.item.name,
      itemCategory: e.item.category as string,
      itemType: e.item.item_type,
      foundAt: e.found_at,
    }));
  }

  // competitive or hybrid: individual GrailEntry records for the season
  const memberIds = league.members.map((m) => m.user_id);
  const entries = await db.grailEntry.findMany({
    where: {
      found: true,
      found_at: { not: null },
      grail: { user_id: { in: memberIds }, season_id: league.season_id },
    },
    include: {
      item: { select: { name: true, category: true, item_type: true } },
      grail: { select: { user: { select: { id: true, display_name: true } } } },
    },
    orderBy: { found_at: "desc" },
    take: limit,
  });

  return entries.map((e) => ({
    id: e.id,
    userId: e.grail.user.id,
    displayName: e.grail.user.display_name,
    itemName: e.item.name,
    itemCategory: e.item.category as string,
    itemType: e.item.item_type,
    foundAt: e.found_at!,
  }));
}
