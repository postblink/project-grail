import { db } from "@/lib/db";

const ARMORY_API = "https://api.projectdiablo2.com/game/character";
const STASH_API = "https://api.projectdiablo2.com/game/stash";

// ──────────────────────────────────────────────
// API types (subset we actually use)
// ──────────────────────────────────────────────

interface ArmoryItemQuality {
  id: number;
  name: string;
}

interface ArmoryItemBase {
  type_code: string;
}

interface ArmoryRuneword {
  name: string;
}

interface ArmoryItem {
  name: string;
  quality: ArmoryItemQuality;
  is_runeword: boolean;
  runeword: ArmoryRuneword | null;
  base: ArmoryItemBase;
  socketed: ArmoryItem[];
}

interface ArmoryResponse {
  items: ArmoryItem[];
  mercenary?: {
    items: ArmoryItem[];
  };
}

interface StashTab {
  items?: ArmoryItem[];
  currency?: ArmoryItem[];
}

interface StashResponse {
  items?: ArmoryItem[];
  tabs?: StashTab[];
  currency?: ArmoryItem[];
}

// ──────────────────────────────────────────────
// Public types
// ──────────────────────────────────────────────

export interface ArmoryPreviewItem {
  id: string;
  name: string;
  category: string;
  item_type: string | null;
  set_name: string | null;
}

export interface ArmoryPreviewResult {
  newItems: ArmoryPreviewItem[];
  alreadyFound: ArmoryPreviewItem[];
  unmatchedNames: string[];
  failedCharacters: string[];
  stashIncluded: boolean;
  stashFailed: boolean;
  stashEmpty: boolean;
  needsRelink: boolean;
}

// ──────────────────────────────────────────────
// Fetch + parse
// ──────────────────────────────────────────────

async function fetchCharacter(name: string): Promise<ArmoryResponse | null> {
  try {
    const res = await fetch(`${ARMORY_API}/${encodeURIComponent(name)}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return (await res.json()) as ArmoryResponse;
  } catch {
    return null;
  }
}

async function fetchStash(token: string, sub: string): Promise<StashResponse | null> {
  try {
    const res = await fetch(`${STASH_API}/${encodeURIComponent(sub)}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });
    if (res.status === 404) {
      return null; // no stash data yet this season
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn("Stash fetch failed:", res.status, body);
      return null;
    }
    const data = (await res.json()) as StashResponse;
    console.log("[stash] raw response keys:", Object.keys(data), "tabs:", data.tabs?.length ?? 0, JSON.stringify(data).substring(0, 800));
    return data;
  } catch (err) {
    console.warn("Stash fetch error:", err);
    return null;
  }
}

function extractNamesFromItem(item: ArmoryItem, out: string[]): void {
  if (item.is_runeword && item.runeword?.name) {
    out.push(item.runeword.name);
  } else if (item.quality?.name === "Unique" || item.quality?.name === "Set") {
    out.push(item.name);
  } else if (item.base?.type_code === "rune") {
    // API returns "Ral Rune", DB stores "Ral" — strip the suffix
    out.push(item.name.replace(/ Rune$/i, "").trim());
  }

  for (const s of item.socketed ?? []) {
    extractNamesFromItem(s, out);
  }
}

function extractItemNames(data: ArmoryResponse): string[] {
  const names: string[] = [];
  const allItems = [...data.items, ...(data.mercenary?.items ?? [])];
  for (const item of allItems) {
    extractNamesFromItem(item, names);
  }
  return names;
}

function extractStashItemNames(data: StashResponse): string[] {
  const names: string[] = [];
  const topLevel = data.items ?? [];
  const topCurrency = data.currency ?? [];
  const tabItems = (data.tabs ?? []).flatMap((t) => [...(t.items ?? []), ...(t.currency ?? [])]);
  for (const item of [...topLevel, ...topCurrency, ...tabItems]) {
    extractNamesFromItem(item, names);
  }
  return names;
}

// ──────────────────────────────────────────────
// Preview (no DB writes)
// ──────────────────────────────────────────────

export async function previewArmoryImport(
  grailId: string,
  characterNames: string[],
  pd2Token?: string | null,
  pd2Sub?: string | null,
): Promise<ArmoryPreviewResult> {
  const failedCharacters: string[] = [];
  const rawNames: string[] = [];
  let stashIncluded = false;
  let stashFailed = false;
  let stashEmpty = false;

  // Fetch characters (may be empty for stash-only imports)
  await Promise.all(
    characterNames.map(async (charName) => {
      const data = await fetchCharacter(charName.trim());
      if (!data) {
        failedCharacters.push(charName.trim());
      } else {
        rawNames.push(...extractItemNames(data));
      }
    }),
  );

  // Fetch shared stash when a PD2 token and sub are available
  if (pd2Token && pd2Sub) {
    const stashData = await fetchStash(pd2Token, pd2Sub);
    if (stashData === null) {
      // null = 404 (no stash data this season yet) or fetch error
      stashEmpty = true;
    } else {
      const stashNames = extractStashItemNames(stashData);
      if (stashNames.length > 0) {
        rawNames.push(...stashNames);
        stashIncluded = true;
      } else {
        stashEmpty = true;
      }
    }
  }

  const uniqueNames = [...new Set(rawNames.map((n) => n.toLowerCase()))];

  const dbItems = await db.item.findMany({
    where: {
      name: { in: uniqueNames, mode: "insensitive" },
      is_active: true,
    },
    select: { id: true, name: true, category: true, item_type: true, set_name: true },
  });

  const dbItemMap = new Map(dbItems.map((i) => [i.name.toLowerCase(), i]));
  const unmatchedNames = uniqueNames.filter((n) => !dbItemMap.has(n));

  const existingEntries = await db.grailEntry.findMany({
    where: { grail_id: grailId, item_id: { in: dbItems.map((i) => i.id) } },
    select: { item_id: true, found: true },
  });
  const foundItemIds = new Set(
    existingEntries.filter((e) => e.found).map((e) => e.item_id),
  );

  const newItems: ArmoryPreviewItem[] = [];
  const alreadyFound: ArmoryPreviewItem[] = [];

  for (const item of dbItems) {
    const preview: ArmoryPreviewItem = {
      id: item.id,
      name: item.name,
      category: item.category,
      item_type: item.item_type,
      set_name: item.set_name,
    };
    if (foundItemIds.has(item.id)) {
      alreadyFound.push(preview);
    } else {
      newItems.push(preview);
    }
  }

  return {
    newItems,
    alreadyFound,
    unmatchedNames,
    failedCharacters,
    stashIncluded,
    stashFailed,
    stashEmpty,
    needsRelink: false,
  };
}
