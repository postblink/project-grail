import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { ItemCategory } from "../src/generated/prisma/enums.ts";
import { fileURLToPath } from "url";
import * as fs from "fs";
import * as path from "path";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface SeedItem {
  name: string;
  category: string;
  item_type: string | null;
  set_name: string | null;
  pd2_exclusive: boolean;
  is_active: boolean;
  wiki_url: string | null;
}

const SEED_DATA_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "seed-data/items.json"
);

const CATEGORY_MAP: Record<string, ItemCategory> = {
  unique: ItemCategory.unique,
  set: ItemCategory.set,
  runeword: ItemCategory.runeword,
  rune: ItemCategory.rune,
  other: ItemCategory.other,
};

async function main() {
  // Upsert a placeholder season for seeded items that don't belong to a specific season
  await prisma.season.upsert({
    where: { slug: "s0-vanilla" },
    update: {},
    create: {
      name: "Vanilla LoD (Baseline)",
      slug: "s0-vanilla",
      start_date: new Date("2001-06-29"), // D2 LoD release date
      is_active: false,
      is_current: false,
    },
  });

  const rawItems: SeedItem[] = JSON.parse(fs.readFileSync(SEED_DATA_PATH, "utf8"));

  let created = 0;
  let updated = 0;

  for (const item of rawItems) {
    const category = CATEGORY_MAP[item.category];
    if (!category) {
      console.warn(`Unknown category "${item.category}" for item "${item.name}" — skipping`);
      continue;
    }

    const existing = await prisma.item.findUnique({ where: { name: item.name } });

    await prisma.item.upsert({
      where: { name: item.name },
      update: {
        category,
        item_type: item.item_type,
        set_name: item.set_name,
        pd2_exclusive: item.pd2_exclusive,
        is_active: item.is_active,
        wiki_url: item.wiki_url,
      },
      create: {
        name: item.name,
        category,
        item_type: item.item_type,
        set_name: item.set_name,
        pd2_exclusive: item.pd2_exclusive,
        is_active: item.is_active,
        wiki_url: item.wiki_url,
      },
    });

    if (existing) updated++;
    else created++;
  }

  console.log(`Seed complete: ${created} created, ${updated} updated (${rawItems.length} total)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
