import * as cheerio from "cheerio";
import { fileURLToPath } from "url";
import * as fs from "fs";
import * as path from "path";

const WIKI_BASE = "https://wiki.projectdiablo2.com";
const ALL_ITEMS_URL = `${WIKI_BASE}/wiki/All_Items`;
const ALL_SET_ITEMS_URL = `${WIKI_BASE}/wiki/All_Set_Items`;
const OUTPUT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../prisma/seed-data/items.json"
);

interface ScrapedItem {
  name: string;
  category: "unique" | "set" | "runeword" | "rune" | "other";
  item_type: string | null;
  set_name: string | null;
  pd2_exclusive: boolean;
  is_active: boolean;
  wiki_url: string | null;
}

async function fetchPage(url: string): Promise<cheerio.CheerioAPI> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return cheerio.load(await res.text());
}

function sectionToItemType(sectionId: string): string {
  return sectionId
    .replace(/^Unique_/, "")
    .replace(/_Runewords$/, "")
    .replace(/_/g, " ")
    .toLowerCase();
}

function wikiUrl(name: string): string {
  return `${WIKI_BASE}/wiki/${encodeURIComponent(name.replace(/ /g, "_"))}`;
}

// Page structure notes:
// - Unique items are h4 elements under Unique_* h2 sections (except Unique_Jewels)
// - Unique jewels (Rainbow Facets) are h3 with d2-gold class under Unique_Jewels h2
// - Set items are embedded as h4 elements under Unique_Jewels h2 (all come from All_Set_Items instead)
// - Runewords are h3 elements under *_Runewords h2 sections
// - Runes are rows in a wikitable under the Runes h2
async function scrapeMainPage(): Promise<ScrapedItem[]> {
  const $ = await fetchPage(ALL_ITEMS_URL);
  const items: ScrapedItem[] = [];

  let currentH2Id = "";
  let currentH4SubType = ""; // weapon-type sub-header within class weapons (e.g. "bows", "javelins")

  // The Amazon class weapons section uses an extra heading level:
  // h2 Unique_Class_Weapons → h3 Amazon → h4 Bows/Spears/Javelins → h5 item
  // All other classes: h2 Unique_Class_Weapons → h3 Class → h4 item
  // Track h4 sub-type headers so we can capture h5 items with the right item_type.
  const CLASS_WEAPON_SUBTYPES = new Set(["Bows_2", "Spears_2", "Javelins"]);

  $("h2[id], h3[id], h4[id], h5[id]").each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const id = $(el).attr("id") ?? "";
    const name = $(el).text().trim();

    if (tag === "h2") {
      currentH2Id = id;
      currentH4SubType = "";
      return;
    }

    // Unique items under any Unique_* section:
    // - h4 elements (most unique items, all weapon/armor types)
    // - h3 elements with d2-gold class (amulets, rings, charms, jewels use h3 instead of h4)
    // - h5 elements under class-weapon sub-type headers (Amazon bows/spears/javelins)
    // The Unique_Jewels h4s are embedded set pieces — skip them; set items come from All_Set_Items.
    const isUnderUniqueSection = currentH2Id.startsWith("Unique_");

    // h4 sub-type headers within class weapons (e.g. "Bows", "Javelins") — track but don't emit
    if (tag === "h4" && currentH2Id === "Unique_Class_Weapons" && CLASS_WEAPON_SUBTYPES.has(id)) {
      currentH4SubType = id.replace(/_2$/, "").toLowerCase();
      return;
    }
    // Any other h4 clears the sub-type (we're back to a real item or new class)
    if (tag === "h4") currentH4SubType = "";

    const isH4Unique = tag === "h4" && isUnderUniqueSection && currentH2Id !== "Unique_Jewels";
    const isH3Unique = tag === "h3" && isUnderUniqueSection && $(el).find(".d2-gold").length > 0;
    const isH5Unique = tag === "h5" && isUnderUniqueSection && currentH4SubType !== "";

    if ((isH4Unique || isH3Unique || isH5Unique) && name) {
      items.push({
        name,
        category: "unique",
        item_type: isH5Unique ? currentH4SubType : sectionToItemType(currentH2Id),
        set_name: null,
        pd2_exclusive: false,
        is_active: true,
        wiki_url: wikiUrl(name),
      });
      return;
    }

    // Runewords — h3 under *_Runewords sections
    if (tag === "h3" && currentH2Id.endsWith("_Runewords") && name) {
      items.push({
        name,
        category: "runeword",
        item_type: sectionToItemType(currentH2Id),
        set_name: null,
        pd2_exclusive: false,
        is_active: true,
        wiki_url: wikiUrl(name),
      });
    }
  });

  // Runes — table with columns: # | Rune (icon) | Name | Level | ...
  $("table.wikitable").each((_, table) => {
    const headers = $(table)
      .find("tr")
      .first()
      .find("th")
      .map((_, th) => $(th).text().trim())
      .get();
    if (headers[0] === "#" && headers[2] === "Name" && headers[3] === "Level") {
      $(table)
        .find("tr")
        .each((i, row) => {
          if (i === 0) return;
          const runeName = $(row).find("td").eq(2).text().trim();
          if (runeName) {
            items.push({
              name: runeName,
              category: "rune",
              item_type: null,
              set_name: null,
              pd2_exclusive: false,
              is_active: true,
              wiki_url: wikiUrl(runeName),
            });
          }
        });
    }
  });

  return items;
}

async function scrapeSetItemsPage(): Promise<ScrapedItem[]> {
  const $ = await fetchPage(ALL_SET_ITEMS_URL);
  const items: ScrapedItem[] = [];

  let currentSetName = "";

  $("h2[id], h3[id], h4[id]").each((_, el) => {
    const tag = el.tagName.toLowerCase();
    const name = $(el).text().trim();

    if (tag === "h3") {
      currentSetName = name;
      return;
    }

    // Skip "Set Bonuses for X" pseudo-items
    if (tag === "h4" && currentSetName && name && !name.startsWith("Set Bonuses for")) {
      items.push({
        name,
        category: "set",
        item_type: null,
        set_name: currentSetName,
        pd2_exclusive: false,
        is_active: true,
        wiki_url: wikiUrl(name),
      });
    }
  });

  return items;
}

async function main() {
  console.log("Scraping All_Items...");
  const mainItems = await scrapeMainPage();
  const uniqueCount = mainItems.filter((i) => i.category === "unique").length;
  const runewordCount = mainItems.filter((i) => i.category === "runeword").length;
  const runeCount = mainItems.filter((i) => i.category === "rune").length;
  console.log(`  ${uniqueCount} unique items, ${runewordCount} runewords, ${runeCount} runes`);

  console.log("Scraping All_Set_Items...");
  const setItems = await scrapeSetItemsPage();
  console.log(`  ${setItems.length} set items`);

  const all = [...mainItems, ...setItems];

  // Deduplicate by name — mainItems come first so unique items take priority.
  // Set items from All_Set_Items won't conflict since we skip embedded set pieces
  // from the main page.
  const seen = new Set<string>();
  const deduped = all.filter((item) => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const byCat = deduped.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\nTotal: ${deduped.length} items`, byCat);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(deduped, null, 2));
  console.log(`Written to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
