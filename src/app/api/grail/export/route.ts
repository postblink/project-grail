import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Maps our DB item names → FilterForge GRAIL_DATA names where they differ.
// Only uniques and set items — FilterForge doesn't track runewords or runes.
const FILTERFORGE_ALIASES: Record<string, string> = {
  "Harlequin Crest":      "Shako",
  "The Gladiator's Bane": "Gladiator's Bane",
  "Spirit Shroud":        "The Spirit Shroud",
  // Rainbow Facets are stored as 4 variants in our DB; FF treats them as one
  "Rainbow Facet (Fire)":      "Rainbow Facet",
  "Rainbow Facet (Cold)":      "Rainbow Facet",
  "Rainbow Facet (Lightning)": "Rainbow Facet",
  "Rainbow Facet (Poison)":    "Rainbow Facet",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json(
      { error: "Missing username parameter" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const user = await db.user.findFirst({
    where: { display_name: { equals: username, mode: "insensitive" } },
    select: { id: true, display_name: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  // Find the user's current season grail
  const grail = await db.grail.findFirst({
    where: {
      user_id: user.id,
      season: { is_current: true },
    },
    include: {
      season: { select: { name: true } },
      entries: {
        where: {
          found: true,
          item: { category: { in: ["unique", "set"] }, is_active: true },
        },
        select: { item: { select: { name: true } } },
      },
    },
  });

  const foundNames: string[] = [];
  const seen = new Set<string>();

  for (const entry of grail?.entries ?? []) {
    const raw = entry.item.name;
    const exported = FILTERFORGE_ALIASES[raw] ?? raw;
    if (!seen.has(exported)) {
      seen.add(exported);
      foundNames.push(exported);
    }
  }

  return NextResponse.json(
    {
      username: user.display_name,
      season: grail?.season?.name ?? null,
      exported_at: new Date().toISOString(),
      found: foundNames,
    },
    { headers: CORS_HEADERS }
  );
}
