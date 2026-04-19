/**
 * Wipes all user-generated data from the database while preserving items and seasons.
 * Run against production before launch: DATABASE_URL=<url> npx tsx scripts/reset-user-data.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("Resetting user data...");

  await prisma.$transaction([
    prisma.leagueGrailEntry.deleteMany(),
    prisma.leagueMember.deleteMany(),
    prisma.league.deleteMany(),
    prisma.armoryImport.deleteMany(),
    prisma.grailEntry.deleteMany(),
    prisma.grail.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verificationToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log("Done. Items and seasons preserved.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
