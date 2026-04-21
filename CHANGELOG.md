# Changelog

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
