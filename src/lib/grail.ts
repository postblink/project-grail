import { db } from "@/lib/db";

export async function getCurrentSeason() {
  return db.season.findFirst({ where: { is_current: true } });
}

export async function getOrCreateGrail(userId: string, seasonId: string) {
  const existing = await db.grail.findUnique({
    where: { user_id_season_id: { user_id: userId, season_id: seasonId } },
  });
  if (existing) return existing;
  return db.grail.create({ data: { user_id: userId, season_id: seasonId } });
}

export interface GrailItemRow {
  id: string;
  name: string;
  category: string;
  item_type: string | null;
  set_name: string | null;
  pd2_exclusive: boolean;
  wiki_url: string | null;
  found: boolean;
  found_at: Date | null;
}

export async function getGrailItems(grailId: string): Promise<GrailItemRow[]> {
  const [items, entries] = await Promise.all([
    db.item.findMany({
      where: { is_active: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: { id: true, name: true, category: true, item_type: true, set_name: true, pd2_exclusive: true, wiki_url: true },
    }),
    db.grailEntry.findMany({
      where: { grail_id: grailId },
      select: { item_id: true, found: true, found_at: true },
    }),
  ]);

  const entryMap = new Map(entries.map((e) => [e.item_id, e]));

  return items.map((item) => {
    const entry = entryMap.get(item.id);
    return {
      ...item,
      category: item.category as string,
      found: entry?.found ?? false,
      found_at: entry?.found_at ?? null,
    };
  });
}

export async function getPublicGrailData(username: string) {
  const user = await db.user.findFirst({
    where: { display_name: { equals: username, mode: "insensitive" }, deleted_at: null },
    select: { id: true, display_name: true },
  });
  if (!user) return null;

  const season = await getCurrentSeason();
  if (!season) return { user, season: null, items: [] as GrailItemRow[], progress: null };

  const grail = await db.grail.findUnique({
    where: { user_id_season_id: { user_id: user.id, season_id: season.id } },
  });
  const items = grail ? await getGrailItems(grail.id) : ([] as GrailItemRow[]);
  return { user, season, items, progress: computeProgress(items) };
}

export function computeProgress(items: GrailItemRow[]) {
  const total = items.length;
  const found = items.filter((i) => i.found).length;
  const byCategory = Object.fromEntries(
    Object.entries(
      items.reduce<Record<string, { total: number; found: number }>>((acc, item) => {
        const cat = item.category;
        if (!acc[cat]) acc[cat] = { total: 0, found: 0 };
        acc[cat].total++;
        if (item.found) acc[cat].found++;
        return acc;
      }, {})
    ).map(([cat, counts]) => [cat, { ...counts, pct: Math.round((counts.found / counts.total) * 100) }])
  );
  return { total, found, pct: total > 0 ? Math.round((found / total) * 100) : 0, byCategory };
}
