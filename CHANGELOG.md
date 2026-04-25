# Changelog

## 2026-04-25

### Added
- **PD2 account linking** — users can now link their Project Diablo 2 account from the Settings page. Linking enables shared stash import and auto-populates the character list on the armory import screen.
- **Shared stash import** — armory imports now include items from the PD2 shared stash (currency tab). Runes and stash items are merged with character inventory before the diff step.
- **Account unlinking** — Discord and PD2 accounts can be unlinked individually from Settings.
- **Character list auto-population** — the armory import modal now pre-fills the character list from the linked PD2 account, so users no longer have to type character names manually.
- **Route protection middleware** — NextAuth middleware now guards all authenticated routes at the edge, replacing page-level redirect-only protection.
- **Admin league management** — admin users can access and edit any league's settings without being a commissioner; the Settings gear button is now visible to admins on all league pages.
- **League type auto-expand** — selecting a league type on the Create League form immediately expands its description inline; the separate info toggle button is removed.

### Improved
- **Discord batch embeds** — notifications now include a bullet list of item names found and a thumbnail of the first item. Messages are de-duplicated across leagues that share the same webhook URL.
- **UX polish** — settings gear icon in the nav, league type and ladder mode detail text in the create form, Discord webhook help tooltip, PD2-exclusive item tooltip, grail empty state copy, and progress milestone callouts on the dashboard.

### Fixed
- **Armory import failing for large character rosters** — Zod validation was capping the character array at 10 entries; raised to 30.
- **Discord batch missing item names** — the armory confirm route was not populating `item_names` in the batch record, causing embeds to show a count with no list.
- **Shared stash 404 on new accounts** — the PD2 stash API returns 404 until a user opens their shared stash in-game at least once. The import UI now detects this case and shows an actionable message instead of a generic error.
- **Rune name mismatch** — the PD2 API returns rune names with a ` Rune` suffix (e.g. `El Rune`); the DB stores them without it. The parser now strips the suffix before matching.
- **Legacy PD2 account records** — users who linked their PD2 account before the sub→username fix stored the OAuth sub ID instead of the username. Tokens are now auto-healed on next use.
- **JWT invalidation on deleted users** — JWTs were not invalidated when a user record was removed; the token callback now checks DB existence and rejects stale sessions.
- **Admin item import N+1** — the JSON import endpoint was issuing one `findUnique` per item to check existence; replaced with a single bulk `findMany` lookup.
- **Unauthenticated debug endpoint** — `debug/db` had no auth check and leaked session data; removed.

### Performance
- Added composite index on `grail_entries(grail_id, found)` — speeds up grail progress queries.
- Added composite index on `items(is_active, category)` — speeds up filtered item list queries.

## 2026-04-21

### Added
- **Discord notification batching** — rapid item finds and armory imports are now grouped into a single summary embed per user per league. Events accumulate in a `DiscordBatch` DB record with a 3-minute idle window; a Vercel cron (`/api/cron/discord-flush`, every 2 minutes) flushes ready batches and sends one embed instead of one-per-item. Prevents webhook spam during fast checklist sessions or large armory imports.
- **Batch summary embed** — shows finder name linked to their grail profile, items found count, `pct_before → pct_current`, any milestones crossed, and any announceable achievements unlocked. Color reflects the highest milestone reached in the batch.
- **`vercel.json` cron config** — schedules the flush endpoint at `*/2 * * * *`.

### Notes
- `CRON_SECRET` env var required in Vercel project settings — used to authenticate the cron job. Set it to any random string and Vercel will inject it into cron request headers automatically.

## 2026-04-20

### Added
- **Wiki item tooltips** — hover the ⓘ icon on any item to see its sprite, base type, required level, stats, and a link to the wiki. Stats are fetched and cached on first hover.
- **Rune stats in tooltips** — runes show weapon/armor/shield socket effects and required level, parsed from the Runes wiki page.
- **Item type filter** — dropdown on the grail checklist to filter by weapon type, armor slot, jewelry, or runeword slot.
- **League top 5 leaderboard** — compact contributor widget at the top of each league page with medals for the top 3, linked to grail profiles.

### Improved
- **Discord webhook embeds** — item find embeds now colored by category (gold/green/orange/amber), show the item sprite thumbnail, link the item name to its wiki page, and include an author link to the finder's grail profile. Milestone colors are more distinct (green 25% → blue 50% → orange 75% → purple 100%).
- **Wiki icon** — changed from a generic external-link arrow to an info circle (ⓘ) to better signal hover interaction.

### Fixed
- **Rune images** — were generating `El.png`; wiki stores them as `RuneEl.png`.
- **Runeword tooltip images** — no wiki images exist for runewords; removed the broken 404 request and empty image area.
- **PD2-exclusive item stats** — items with no vanilla counterpart use a single-column wiki table; parser previously only handled two-column (Before/After) format.
- **Milestone achievements firing on every find** — `totalItems` was counting grail entries in the DB rather than all active items, causing `foundCount / totalCount` to always equal ~100%. Fixed in both the manual entry and armory import routes.
- **Claudezilla directory** — excluded from TypeScript build and added to `.gitignore`.
