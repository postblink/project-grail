import { db } from "@/lib/db";

const ARMORY_API = "https://api.projectdiablo2.com/game/character";

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
  newItems: ArmoryPreviewItem[];       // not yet found in grail → will be marked found
  alreadyFound: ArmoryPreviewItem[];   // already found → no change
  unmatchedNames: string[];            // parsed but not in DB
  failedCharacters: string[];          // armory fetch failed for these
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

function extractNamesFromItem(item: ArmoryItem, out: string[]): void {
  if (item.is_runeword && item.runeword?.name) {
    out.push(item.runeword.name);
  } else if (item.quality?.name === "Unique" || item.quality?.name === "Set") {
    out.push(item.name);
  } else if (item.base?.type_code === "rune") {
    out.push(item.name); // e.g. "El Rune"
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

// ──────────────────────────────────────────────
// Preview (no DB writes)
// ──────────────────────────────────────────────

export async function previewArmoryImport(
  grailId: string,
  characterNames: string[],
): Promise<ArmoryPreviewResult> {
  const failedCharacters: string[] = [];
  const rawNames: string[] = [];

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

  // Deduplicate extracted names
  const uniqueNames = [...new Set(rawNames.map((n) => n.toLowerCase()))];

  // Fetch all active items matching any of the extracted names
  const dbItems = await db.item.findMany({
    where: {
      name: { in: uniqueNames, mode: "insensitive" },
      is_active: true,
    },
    select: { id: true, name: true, category: true, item_type: true, set_name: true },
  });

  const dbItemMap = new Map(dbItems.map((i) => [i.name.toLowerCase(), i]));

  // Find which names had no DB match
  const unmatchedNames = uniqueNames.filter((n) => !dbItemMap.has(n));

  // Load existing found entries for this grail
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

  return { newItems, alreadyFound, unmatchedNames, failedCharacters };
}
