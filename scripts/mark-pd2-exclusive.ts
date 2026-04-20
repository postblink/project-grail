/**
 * Fetches vanilla D2 item names from d2grail.com and compares against items.json.
 * Items in our PD2 list that are NOT in vanilla D2 are marked pd2_exclusive: true.
 * Updates items.json in place, then you can re-run `npx prisma db seed` to sync the DB.
 */

import * as cheerio from "cheerio";
import { fileURLToPath } from "url";
import * as fs from "fs";
import * as path from "path";

const ITEMS_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../prisma/seed-data/items.json"
);

async function fetchHtml(url: string): Promise<cheerio.CheerioAPI> {
  console.log(`  Fetching ${url}...`);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PD2GrailBot/1.0)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return cheerio.load(await res.text());
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "'")   // normalize curly apostrophes
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchVanillaUniques(): Promise<Set<string>> {
  const $ = await fetchHtml("https://d2grail.com/items/uniques");
  const names = new Set<string>();
  $("a[href*='/items/uniques/']").each((_, el) => {
    const text = $(el).text().trim();
    if (text) names.add(normalize(text));
  });
  console.log(`    → ${names.size} unique item names`);
  return names;
}

async function fetchVanillaSets(): Promise<Set<string>> {
  const $ = await fetchHtml("https://d2grail.com/items/sets");
  const names = new Set<string>();
  $("a[href*='/items/sets/']").each((_, el) => {
    const text = $(el).text().trim();
    if (text) names.add(normalize(text));
  });
  console.log(`    → ${names.size} set item names`);
  return names;
}

async function fetchVanillaRunewords(): Promise<Set<string>> {
  const $ = await fetchHtml("https://d2grail.com/runewords");
  const names = new Set<string>();
  $("a[href*='/runewords/']").each((_, el) => {
    const text = $(el).text().trim();
    if (text) names.add(normalize(text));
  });
  console.log(`    → ${names.size} runeword names`);
  return names;
}

async function fetchVanillaRunes(): Promise<Set<string>> {
  const $ = await fetchHtml("https://d2grail.com/items/runes");
  const names = new Set<string>();
  // Rune names appear in heading elements and strong tags
  $("h3, h4, strong, td").each((_, el) => {
    const text = $(el).text().trim();
    // Rune names are short (2-5 chars) and end with "Rune"
    if (/^\w{2,5}\s+Rune$/.test(text)) {
      names.add(normalize(text.replace(/\s+Rune$/, "").trim() + " Rune"));
    }
    // Also match bare rune names (El, Eld, Tir, etc.)
    if (/^[A-Z][a-z]{1,4}$/.test(text)) {
      names.add(normalize(text + " Rune"));
    }
  });
  // Fallback: all 33 known vanilla runes
  const VANILLA_RUNES = [
    "El","Eld","Tir","Nef","Eth","Ith","Tal","Ral","Ort","Thul",
    "Amn","Sol","Shael","Dol","Hel","Io","Lum","Ko","Fal","Lem",
    "Pul","Um","Mal","Ist","Gul","Vex","Ohm","Lo","Sur","Ber",
    "Jah","Cham","Zod",
  ];
  for (const r of VANILLA_RUNES) names.add(normalize(r + " Rune"));
  console.log(`    → ${names.size} rune names (+ 33 hardcoded vanilla runes)`);
  return names;
}

async function main() {
  console.log("Fetching vanilla D2 item lists from d2grail.com...");

  const [vanillaUniques, vanillaSets, vanillaRunewords, vanillaRunes] = await Promise.all([
    fetchVanillaUniques(),
    fetchVanillaSets(),
    fetchVanillaRunewords(),
    fetchVanillaRunes(),
  ]);

  const vanillaByCategory: Record<string, Set<string>> = {
    unique: vanillaUniques,
    set: vanillaSets,
    runeword: vanillaRunewords,
    rune: vanillaRunes,
  };

  console.log("\nLoading items.json...");
  const items: Array<Record<string, unknown>> = JSON.parse(fs.readFileSync(ITEMS_PATH, "utf8"));
  console.log(`  ${items.length} items loaded`);

  let marked = 0;
  let already = 0;
  let skipped = 0;

  for (const item of items) {
    const cat = item.category as string;
    const vanillaSet = vanillaByCategory[cat];

    if (!vanillaSet) {
      // "other" category — skip
      skipped++;
      continue;
    }

    const itemName = normalize(item.name as string);
    const isVanilla = vanillaSet.has(itemName);

    if (!isVanilla) {
      if (!item.pd2_exclusive) {
        item.pd2_exclusive = true;
        marked++;
      } else {
        already++;
      }
    } else {
      item.pd2_exclusive = false;
    }
  }

  fs.writeFileSync(ITEMS_PATH, JSON.stringify(items, null, 2));

  console.log(`\nDone.`);
  console.log(`  Newly marked pd2_exclusive: ${marked}`);
  console.log(`  Already marked:             ${already}`);
  console.log(`  Skipped (other category):   ${skipped}`);
  console.log(`\nRun 'npx prisma db seed' to sync the DB.`);

  // Print a sample of newly exclusive items for review
  const newlyExclusive = items
    .filter((i) => i.pd2_exclusive)
    .slice(0, 20)
    .map((i) => `  ${i.category}: ${i.name}`);
  if (newlyExclusive.length > 0) {
    console.log(`\nSample of pd2_exclusive items:`);
    console.log(newlyExclusive.join("\n"));
    const totalExclusive = items.filter((i) => i.pd2_exclusive).length;
    if (totalExclusive > 20) console.log(`  ... and ${totalExclusive - 20} more`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
