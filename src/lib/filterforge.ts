import type { GrailItemRow } from "@/lib/grail";

const FILTERFORGE_BASE = "https://maaaaaarrk.github.io/FilterForge/editor.html";

const ALIASES: Record<string, string> = {
  "Harlequin Crest":           "Shako",
  "The Gladiator's Bane":      "Gladiator's Bane",
  "Spirit Shroud":             "The Spirit Shroud",
  "Rainbow Facet (Fire)":      "Rainbow Facet",
  "Rainbow Facet (Cold)":      "Rainbow Facet",
  "Rainbow Facet (Lightning)": "Rainbow Facet",
  "Rainbow Facet (Poison)":    "Rainbow Facet",
};

export function buildFilterForgeUrl(items: GrailItemRow[]): string {
  const found: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (!item.found) continue;
    if (item.category !== "unique" && item.category !== "set") continue;
    const name = ALIASES[item.name] ?? item.name;
    if (!seen.has(name)) {
      seen.add(name);
      found.push(name);
    }
  }

  const encoded = Buffer.from(JSON.stringify({ found })).toString("base64");
  return `${FILTERFORGE_BASE}?graildata=${encoded}`;
}
