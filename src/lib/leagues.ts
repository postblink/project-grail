import { db } from "@/lib/db";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface GrailScope {
  unique: boolean;
  set: boolean;
  runeword: boolean;
  rune: boolean;
  pd2_exclusive: boolean;
  [key: string]: boolean;
}

export const DEFAULT_GRAIL_SCOPE: GrailScope = {
  unique: true,
  set: true,
  runeword: true,
  rune: true,
  pd2_exclusive: true,
};

export type LeagueWithMeta = Awaited<ReturnType<typeof getLeague>>;
export type LeagueSummary = Awaited<ReturnType<typeof listPublicLeagues>>[number];

// ──────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export function generateInviteCode(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10);
}

// ──────────────────────────────────────────────
// Queries
// ──────────────────────────────────────────────

export async function getLeague(slug: string) {
  return db.league.findUnique({
    where: { slug },
    include: {
      season: { select: { id: true, name: true, slug: true, is_current: true } },
      commissioner: { select: { id: true, display_name: true } },
      members: {
        include: { user: { select: { id: true, display_name: true } } },
        orderBy: { joined_at: "asc" },
      },
    },
  });
}

export async function listPublicLeagues() {
  return db.league.findMany({
    where: { is_private: false },
    include: {
      season: { select: { name: true, slug: true } },
      _count: { select: { members: true } },
    },
    orderBy: { created_at: "desc" },
  });
}

export async function getUserLeagues(userId: string) {
  return db.leagueMember.findMany({
    where: { user_id: userId },
    include: {
      league: {
        include: {
          season: { select: { name: true, slug: true } },
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joined_at: "desc" },
  });
}

export async function getMemberRole(leagueId: string, userId: string) {
  const member = await db.leagueMember.findUnique({
    where: { league_id_user_id: { league_id: leagueId, user_id: userId } },
    select: { role: true },
  });
  return member?.role ?? null;
}

export function isCommissioner(role: string | null): boolean {
  return role === "commissioner" || role === "co_commissioner";
}

// ──────────────────────────────────────────────
// Cooperative grail data
// ──────────────────────────────────────────────

export interface CoopItemRow {
  id: string;
  name: string;
  category: string;
  item_type: string | null;
  set_name: string | null;
  pd2_exclusive: boolean;
  found: boolean;
  found_at: Date | null;
  found_by_id: string | null;
  found_by_name: string | null;
}

export async function getCoopGrailItems(
  leagueId: string,
  grailScope: GrailScope,
): Promise<CoopItemRow[]> {
  const activeCategories = (["unique", "set", "runeword", "rune"] as const).filter(
    (cat) => grailScope[cat],
  );

  const [items, entries] = await Promise.all([
    db.item.findMany({
      where: {
        is_active: true,
        category: { in: activeCategories },
        ...(grailScope.pd2_exclusive === false && { pd2_exclusive: false }),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: { id: true, name: true, category: true, item_type: true, set_name: true, pd2_exclusive: true },
    }),
    db.leagueGrailEntry.findMany({
      where: { league_id: leagueId },
      include: { found_by: { select: { id: true, display_name: true } } },
    }),
  ]);

  const entryMap = new Map(entries.map((e) => [e.item_id, e]));

  return items.map((item) => {
    const entry = entryMap.get(item.id);
    return {
      ...item,
      category: item.category as string,
      found: !!entry,
      found_at: entry?.found_at ?? null,
      found_by_id: entry?.found_by.id ?? null,
      found_by_name: entry?.found_by.display_name ?? null,
    };
  });
}
