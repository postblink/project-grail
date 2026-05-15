# CLAUDE.md — Project Context & Instructions

This file gives Claude Code the context it needs to work effectively on this project.
Read this before making any changes or additions to the codebase.

@AGENTS.md

---

## What This Project Is

**PD2 Grail Tracker** — a web application for tracking Holy Grail challenge progress in
Project Diablo 2 (PD2), a community mod for Diablo II: Lord of Destruction.

The full product specification lives in `DESIGN.md`. Read it before working on any feature.
This file covers development conventions, architecture decisions, and working instructions.

---

## Key Domain Facts

These are important to understand before touching any feature:

- **PD2 is a seasonal online mod.** The ladder resets every ~4 months. Grail progress
  is per-season. The item database changes each season (new items added, some reworked).

- **Online characters have no local save files, but the armory is public.** PD2 online
  ladder characters are server-side only — there is no `.d2s` file on the player's machine.
  However, PD2 exposes a public armory at `projectdiablo2.com/character/{characterName}`
  that returns character data. This is the basis for the armory import feature. Do not
  build features that assume local save file access for online characters, but DO use
  the armory endpoint for user-initiated imports.

- **Armory import is a snapshot, not a live sync.** When a user imports from the armory,
  it reflects that character's current state at that moment. The app must never auto-uncheck
  grail items because they no longer appear on a character. Import only adds found entries;
  it never removes them. Always make this clear in the UI.

- **No trade site integration.** The official PD2 trade site has no public API.
  Interfacing with it programmatically risks permanent bans for users. Do not build
  any feature that scrapes, queries, or interacts with `projectdiablo2.com/market`.

- **PD2 has its own item pool.** It is NOT the same as vanilla Diablo II LoD or
  Diablo II Resurrected. PD2 adds exclusive unique items, reworks existing items,
  and introduces new runewords each season. The item database must reflect PD2's
  actual items, not data from other games or versions.

- **Item database source:** `wiki.projectdiablo2.com/wiki/All_Items` is the authoritative
  source for PD2 item data. When seeding or updating the database, pull from here.

---

## Architecture

### Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** NextAuth.js (Discord OAuth primary, magic link email fallback — no passwords)
- **Hosting target:** Vercel (app) + Supabase or Railway (database)
- **Email:** Resend (password reset, optional notifications)

### Project Structure
```
/app                    — Next.js App Router pages and layouts
  /app/(auth)           — login, register, password reset pages
  /app/(dashboard)      — authenticated user area
  /app/grail            — solo grail views
  /app/leagues          — league browsing, creation, league pages
  /app/admin            — admin panel (item/season management)
  /app/api              — API route handlers
    /app/api/armory     — armory import endpoint
/components             — shared React components
/lib                    — utility functions, database client, auth config
  /lib/armory.ts        — armory fetch, parse, and diff logic
/prisma
  /schema.prisma        — database schema
  /seed.ts              — item database seed script
/scripts
  /scrape-items.ts      — utility to scrape PD2 wiki for item data
/public                 — static assets
```

### Database Schema
The full conceptual schema is in `DESIGN.md`. The Prisma schema in `/prisma/schema.prisma`
is the source of truth for the actual implementation. Keep them in sync.

Key relationships to keep in mind:
- A `User` has many `Grail` records (one per season + optional all-time)
- A `Grail` has many `GrailEntry` records (one per item in scope)
- `GrailEntry` has an `import_source` field: `'manual'` or `'armory'`
- A `Grail` has many `ArmoryImport` records (audit log of import runs)
- A `League` has many `LeagueMember` records linking users
- League members' individual grails are their own `Grail` records filtered by season
- `LeagueGrailEntry` is used only for cooperative leagues and the hybrid team view

---

## Code Conventions

### General
- Use TypeScript throughout. No `any` types unless absolutely unavoidable — use `unknown`
  and narrow explicitly.
- Prefer `async/await` over `.then()` chains.
- Keep components small and focused. Extract logic into hooks or lib functions.
- Co-locate types with the code that uses them unless they are shared across multiple
  files, in which case put them in a `/types` file in the nearest relevant directory.

### Database / Prisma
- All database access goes through the Prisma client in `/lib/db.ts`.
- Never write raw SQL unless Prisma cannot express the query.
- Always handle Prisma errors explicitly — do not let DB errors bubble up as unhandled
  500s to the client.
- Use Prisma transactions for any operation that modifies multiple tables.

### API Routes
- All API routes live under `/app/api/`.
- Validate request bodies with Zod before touching the database.
- Return consistent JSON error shapes: `{ error: string, code?: string }`.
- Auth-required routes should return `401` (not `403`) when the user is not logged in,
  and `403` when they are logged in but lack permission.
- Commissioner-only league actions must verify the requesting user is the league
  commissioner or a co-commissioner.

### Auth
- Use NextAuth.js session checks via `getServerSession()` in server components and
  API routes. Do not rely on client-side session checks for access control.
- Admin routes must check `user.is_admin === true` server-side.
- Auth is handled via Discord OAuth (primary) and magic link email (fallback).
  There are no passwords. Do not add a credentials provider or any password
  hashing logic.
- On first Discord login, seed the user's display name from their Discord username.
  Store the Discord account ID for re-authentication but do not store OAuth tokens
  beyond what NextAuth.js manages internally.

### Item Data
- The `items` table is effectively read-only at runtime. Mutations only happen through
  the admin panel's JSON import tool.
- Never hard-code item names or IDs in application logic. Always reference items by
  their database ID.
- The `is_active` flag controls whether an item appears in new grails for the current
  season. Inactive items (removed from the game) must still be stored and displayed
  in historical grails — never delete item records.

### Grail Entries
- When a user checks off an item, create the `GrailEntry` with `found = true` and
  `found_at = now()`.
- Unchecking an item sets `found = false` and clears `found_at`. The row is kept —
  do not delete entries on uncheck.
- All timestamps are stored as UTC. Display conversion happens client-side.
- Grail entries created via armory import carry `import_source = 'armory'`. Entries
  created by manual check-off carry `import_source = 'manual'`. This distinction is
  stored but not prominently surfaced in the UI — it is for debugging and auditing only.

### Armory Import

The armory import feature is a core v1 feature, not a v2 addition. It is the primary
way online ladder players will bulk-populate their grail at the start of a session.

**Relevant external tools and libraries:**
- `coleestrin/pd2-character-downloader` — the reference implementation for fetching and
  parsing PD2 armory data. Study this before implementing `/lib/armory.ts`.
- `dschu012/D2SLib` — the underlying `.d2s` parsing library the above is built on.
- `pd2.tools/tools/character-export` — live example of this pattern in production.

**Armory endpoint:** `https://www.projectdiablo2.com/character/{characterName}`
This is a public endpoint — no authentication is required to fetch it. The response
contains character data including equipped items and inventory.

**Implementation rules:**
- Armory fetches are always user-initiated. Never poll the armory automatically.
- A single import run may include multiple character names (for mules). Merge all
  item lists before computing the diff.
- The diff step (showing the user what would be marked found) must happen before any
  DB writes. Show the user what will change and require explicit confirmation.
- The entire confirmation → write operation must be wrapped in a Prisma transaction.
  If any part fails, nothing is written.
- Never remove or uncheck existing grail entries based on armory data. Import only
  creates new found entries; it never modifies or deletes existing ones.
- Record every import run in the `armory_imports` table regardless of outcome.
- If the armory returns an error or unrecognizable data for a character, skip that
  character, continue with others in the batch, and report the failure to the user.
- Item matching is by name (case-insensitive). If a parsed item name does not match
  any item in the database, log it and skip it — do not crash or abort the import.

**What the armory does NOT expose:**
- The shared stash (items stored there must be manually checked off)
- Items the character previously held but has since traded or dropped
- Characters the user did not include in the import

Always make the snapshot nature of imports clear in the UI copy. Suggested message:
*"Import reflects your characters' current inventory. Items in your shared stash or
previously traded away will need to be checked off manually."*

---

## Feature Implementation Order (MVP)

Work in this order unless instructed otherwise:

1. **Database schema and Prisma setup** — get the schema and migrations working first
2. **Item database seed** — seed script that populates items from a JSON file
3. **Auth** — registration, login, session, password reset
4. **Solo grail** — grail creation, item checklist UI, check/uncheck, progress display
5. **Armory import** — `/lib/armory.ts` fetch/parse logic, diff UI, confirm and write
6. **Public profile page** — `/grail/{username}` readable without login
7. **League CRUD** — create league, join league, league settings
8. **League leaderboard** — ranked list of members by completion %
9. **Team found view** — combined item list showing who found what (hybrid leagues)
10. **Activity feed** — recent finds across league members
11. **Admin panel** — season management, item JSON import

Do not start a new feature until the current one has working, tested happy-path behavior.

---

## Item Database Seed

The initial item seed data should come from scraping the PD2 wiki. A utility script at
`/scripts/scrape-items.ts` should:

1. Fetch `https://wiki.projectdiablo2.com/wiki/All_Items`
2. Parse item names and categories from the page
3. Output a structured JSON file at `/prisma/seed-data/items.json`
4. The seed script at `/prisma/seed.ts` then reads this JSON and upserts into the DB

The scrape script is a one-time / per-season utility, not a runtime dependency.

When seeding, mark items as:
- `pd2_exclusive: true` if they are not present in vanilla LoD
- `is_active: true` for all current season items
- `season_introduced: {season_id}` if known, otherwise null for vanilla LoD items

---

## League Type Behavior

The three league types have distinct data behaviors. Make sure the implementation
handles these correctly:

**Competitive:**
- Each member's grail is fully independent
- No shared state between members
- Leaderboard is ranked by individual completion %

**Hybrid (default recommended):**
- Each member tracks their own grail independently
- Additionally, a `LeagueGrailEntry` is written when any member finds an item,
  recording who found it first
- The "team found" view reads from `LeagueGrailEntry`
- Leaderboard ranks individual completion, but team view shows collective coverage

**Cooperative:**
- There is one shared grail for the whole league
- When any member checks off an item, it is marked found for all members
- All `GrailEntry` writes for a cooperative league must also write a `LeagueGrailEntry`
  recording which member found it
- The leaderboard shows member activity / contribution rather than individual completion

---

## Admin Panel

The admin panel lives at `/app/admin/` and is restricted to users with `is_admin = true`.

It must support:
- **Season management:** create seasons (name, slug, start_date, end_date), mark a
  season as current, view all seasons
- **Item management:** view current item list, import a JSON file of item updates
  (upsert by name — do not delete existing items, only add/update), toggle `is_active`
  per item, view items by season

The JSON import format for items:
```json
[
  {
    "name": "Griffon's Eye",
    "category": "unique",
    "item_type": "helm",
    "pd2_exclusive": false,
    "season_introduced": null,
    "is_active": true,
    "wiki_url": "https://wiki.projectdiablo2.com/wiki/Griffon%27s_Eye"
  }
]
```

---

## Environment Variables

Required env vars (add to `.env.local` for local dev, Vercel env for production):

```
DATABASE_URL          — PostgreSQL connection string
NEXTAUTH_SECRET          — random secret for NextAuth.js session signing
NEXTAUTH_URL             — full URL of the app (e.g. http://localhost:3000)
DISCORD_CLIENT_ID        — from Discord Developer Portal OAuth2 settings
DISCORD_CLIENT_SECRET    — from Discord Developer Portal OAuth2 settings
RESEND_API_KEY           — email sending (magic link auth)
EMAIL_FROM               — sender address for magic link emails
```

---

## Things to Avoid

- Do not use `localStorage` for anything security-relevant. Sessions are server-side.
- Do not expose user emails or password hashes in any API response.
- Do not build features that require scraping or querying the PD2 trade site.
- Do not poll the PD2 armory automatically or on any schedule. Armory fetches are
  always user-initiated.
- Do not auto-uncheck or remove grail entries based on armory import data. Imports
  only add found entries; they never remove them.
- Do not hard-delete grail entries, items, seasons, or users. Use soft deletes
  (`is_active`, `deleted_at`) where permanent removal would break historical data.
- Do not assume a user has only one grail — they have one per season plus optionally
  an all-time grail. Always scope grail queries by season.
- Do not build season-agnostic item queries for user-facing grail views. Every grail
  view is scoped to a season.

---

## Source of truth

The design document (`DESIGN.md`) describes intended behavior end to end.
When the code and the design disagree, the design wins until the design is
updated to match. When something is ambiguous, refer to `DESIGN.md` first.
