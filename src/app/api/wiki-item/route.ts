import { NextResponse } from "next/server";

export interface WikiItemInfo {
  baseType: string | null;
  runeCombo: string | null;   // runewords only
  defense: string | null;
  damage: string | null;
  requiredLevel: number | null;
  requiredStrength: number | null;
  requiredDexterity: number | null;
  stats: string[];
}

// Strip all HTML/wiki tags and trim
function stripMarkup(text: string): string {
  return text
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, "$1") // [[link|label]] → label
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseWikitext(wikitext: string, itemName: string): WikiItemInfo | null {
  // Find the item's heading (handles ==, ===, ==== levels with optional d2-gold span)
  const escapedName = itemName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "[''']");
  const headingRe = new RegExp(
    `(={2,6})\\s*(?:<[^>]*>)*${escapedName}(?:</[^>]*>)*\\s*\\1`,
    "i"
  );
  const headingMatch = wikitext.match(headingRe);
  if (!headingMatch) return null;

  const headingLevel = headingMatch[1].length;
  const startIdx = headingMatch.index! + headingMatch[0].length;

  // Grab text until next heading of same or higher level
  const nextHeadingRe = new RegExp(`^={1,${headingLevel}}(?:[^=]|$)`, "m");
  const rest = wikitext.slice(startIdx);
  const nextMatch = rest.match(nextHeadingRe);
  const section = nextMatch ? rest.slice(0, nextMatch.index) : rest;

  // ── Info box ──────────────────────────────────────────────────
  const infoBoxMatch = section.match(/<div class="item-info-box">([\s\S]*?)<\/div>/);
  const infoText = infoBoxMatch ? infoBoxMatch[1] : "";

  // Extract <p> lines from info box (strip old/removed values first)
  const pLines = [...infoText.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => {
      const cleaned = m[1]
        .replace(/<span class="omod">[\s\S]*?<\/span>/gi, "")
        .replace(/\(was[^)]*\)/gi, "")
        .replace(/<b>/gi, "").replace(/<\/b>/gi, "");
      return stripMarkup(cleaned);
    })
    .filter(Boolean);

  let baseType: string | null = null;
  let runeCombo: string | null = null;
  let defense: string | null = null;
  let damage: string | null = null;
  let requiredLevel: number | null = null;
  let requiredStrength: number | null = null;
  let requiredDexterity: number | null = null;

  for (const line of pLines) {
    if (/^Base Defense:/i.test(line)) continue; // skip base defense, show enhanced
    if (/^Defense:/i.test(line)) { defense = line.replace(/^Defense:\s*/i, ""); continue; }
    if (/^(?:One-Hand|Two-Hand|Throw)\s*Damage:/i.test(line)) { damage = line; continue; }
    if (/^Required Level:/i.test(line)) { requiredLevel = parseInt(line.replace(/\D/g, ""), 10) || null; continue; }
    if (/^Required Strength:/i.test(line)) { requiredStrength = parseInt(line.replace(/\D/g, ""), 10) || null; continue; }
    if (/^Required Dexterity:/i.test(line)) { requiredDexterity = parseInt(line.replace(/\D/g, ""), 10) || null; continue; }
    // Rune combo: "Jah • Ith • Ber" style
    if (/^[A-Z][a-z]+(?: [•·] [A-Z][a-z]+)+$/.test(line)) { runeCombo = line; continue; }
    // Base type: first bold paragraph that isn't a stat line
    if (!baseType && !/^Base |^Required|^\d/.test(line)) baseType = line;
  }

  // ── Stats table (wikitable-2col) ─────────────────────────────
  const tableMatch = section.match(/\{\|[\s\S]*?\|\}/);
  const stats: string[] = [];

  if (tableMatch) {
    const tableText = tableMatch[0];
    // Split into rows on |-
    const rows = tableText.split(/^\|-/m).slice(1); // first entry is table header

    for (const row of rows) {
      // Each data row: | Before || After
      const cellMatch = row.match(/^\|\s*([\s\S]*?)\s*\|\|\s*([\s\S]*?)(?:\n|$)/m);
      if (!cellMatch) continue;
      const afterRaw = cellMatch[2].trim();
      if (!afterRaw || afterRaw.startsWith("!")) continue; // skip header rows

      // Strip omod spans (removed/changed vanilla values shown in After column)
      const afterClean = afterRaw.replace(/<span class="omod">[\s\S]*?<\/span>/gi, "").trim();
      const stat = stripMarkup(afterClean);
      if (stat && stat !== "—" && stat !== "-") stats.push(stat);
    }
  }

  if (!baseType && !stats.length) return null;

  return { baseType, runeCombo, defense, damage, requiredLevel, requiredStrength, requiredDexterity, stats };
}

async function fetchWikitext(page: string): Promise<string | null> {
  const apiUrl =
    `https://wiki.projectdiablo2.com/w/api.php` +
    `?action=parse&prop=wikitext&redirects=1&format=json&origin=*` +
    `&page=${encodeURIComponent(page)}`;
  const res = await fetch(apiUrl, {
    next: { revalidate: 86400 },
    headers: { "User-Agent": "pd2grail.com item tooltip" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { parse?: { wikitext?: { "*": string } } };
  return data?.parse?.wikitext?.["*"] ?? null;
}

function parseRuneFromTable(wikitext: string, runeName: string): WikiItemInfo | null {
  // Rune table row: | # || [[File:RuneX.png]] || <span>'''Name'''</span> || level || weapon || chest/helm || shield || group
  const escaped = runeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rowRe = new RegExp(
    `\\|\\s*\\d+\\s*\\|\\|[^|]*\\|\\|[^|]*${escaped}[^|]*\\|\\|\\s*(\\d+)\\s*\\|\\|([^|]*)\\|\\|([^|]*)\\|\\|([^|]*)\\|\\|`,
    "i"
  );
  const m = wikitext.match(rowRe);
  if (!m) return null;

  const [, level, weapon, armorHelm, shield] = m;
  const clean = (s: string) =>
    stripMarkup(s.replace(/<br\s*\/?>/gi, ", ")).replace(/,\s*,/g, ",").trim();

  const stats: string[] = [];
  const w = clean(weapon);
  const a = clean(armorHelm);
  const sh = clean(shield);
  if (w) stats.push(`Weapon: ${w}`);
  if (a) stats.push(`Armor/Helm: ${a}`);
  if (sh && sh !== a) stats.push(`Shield: ${sh}`);

  return {
    baseType: null,
    runeCombo: null,
    defense: null,
    damage: null,
    requiredLevel: level ? parseInt(level, 10) : null,
    requiredStrength: null,
    requiredDexterity: null,
    stats,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");
  const category = searchParams.get("category") ?? "";
  if (!title) return NextResponse.json({ info: null });

  try {
    const decoded = decodeURIComponent(title);
    const itemName = decoded.replace(/_/g, " ");

    if (category === "rune") {
      const wikitext = await fetchWikitext("Runes");
      if (!wikitext) return NextResponse.json({ info: null });
      return NextResponse.json({ info: parseRuneFromTable(wikitext, itemName) });
    }

    const wikitext = await fetchWikitext(decoded);
    if (!wikitext) return NextResponse.json({ info: null });

    const info = parseWikitext(wikitext, itemName);
    return NextResponse.json({ info });
  } catch {
    return NextResponse.json({ info: null });
  }
}
