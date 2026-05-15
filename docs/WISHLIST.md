# Wishlist

Loose notes on directions worth exploring later. Not commitments — just things
the current architecture would make tractable. Add to this freely; prune
when something graduates to a real plan in `DESIGN.md` (or gets ruled out).

---

## D2R (Diablo II: Resurrected) support

**Feasibility: yes, with caveats.** Sibling project or multi-game variant of the
current PD2 tracker is realistic; the schema and league features are already
mostly game-agnostic.

### What Blizzard provides

- **No public API or armory for D2R.** Battle.net's Developer API covers WoW /
  D3 / D4 / Hearthstone / etc. but conspicuously skips D2R. This has been the
  standing community complaint since 2021 and reflects a product decision, not
  an oversight.
- **No web-based character viewer.** Nothing like
  `projectdiablo2.com/character/<name>` exists for D2R.

### What's actually possible

| Character type | Access | Notes |
|---|---|---|
| **Offline** | `.d2s` + `.d2i` save files locally | Same format family as classic LoD. Parseable with the same `dschu012/D2SLib` already referenced for PD2. Drag-and-drop upload → parse → diff/confirm flow, just like the armory path. |
| **Online (Battle.net)** | ❌ | No file, no endpoint, no scraping target. Manual check-off only. Process-hooking tools exist (D2RLAN, etc.) but Windows-only and ToS-risky. |

### Reuse from current codebase

| Layer | Reusable? |
|---|---|
| Schema (Item, Grail, GrailEntry, Season, League, achievements) | ✅ With a `game` enum column |
| League features (coop / hybrid / competitive, leaderboards, Discord) | ✅ Game-agnostic |
| Auth (Discord OAuth, magic link) | ✅ |
| Item DB seeding | 🟡 New source (D2R wiki / fextralife / d2.maxroll.gg) |
| Armory import | ❌ Replace with `.d2s` upload |
| Branding | 🟡 Tweak |

### Two shapes to choose between

**Option A — D2R-only sibling site** (`d2rgrail.com` or similar)
- Fork the repo or run as a second deploy from the same monorepo
- Strip PD2-specific armory code
- Add `.d2s` upload via D2SLib (client-side WASM is safer than server-side parsing)
- Different seed data, different branding
- **Effort: 1–2 weekends.**

**Option B — Multi-game tracker** (`d2grail.com` or rebrand `pd2grail.com`)
- One site, user picks game on signup: PD2 / D2R / vanilla LoD
- Add `game` enum to `Item`, `Season`, `Grail`, `League`
- Per-game import flow: armory for PD2, file upload for D2R, manual for LoD
- Leagues scoped per-game
- **Effort: meaningfully more — schema migration, UI mode switches, season management gets denser.**
- Wider audience; same code unlocks all three communities.

### Legal / ToS

Save-file parsing is safe. Save editors (GoMule, D2RSE, ATMA, Hero Editor)
have operated openly for 20+ years across D2 and D2R with no takedowns —
parsing a file the user owns is not the same as modifying the game. Avoid
anything that talks to Battle.net or hooks the running game process.

### Open questions if we pursue this

- Brand decision: keep PD2-first identity, or rebrand for breadth?
- D2R ladder seasons run on a different cadence than PD2 — how does that
  interact with season switching in the UI?
- Should `.d2s` parsing happen client-side (WASM, safer, slower) or
  server-side (faster, larger attack surface)?
- Multi-game support implies per-game admin tooling for item DB management —
  worth the complexity?

---

## Other ideas to revisit (placeholders — flesh out as they come up)

- **Item rarity weighting on coop leaderboard.** The `TODO(rarity-weight)`
  marker in `src/lib/contribution.ts` is already wired for this — multiply
  `BASE_ITEM_POINTS` by a per-item rarity multiplier once the items table
  carries it. Would make Griffon's Eye worth more than a Krintizz on the
  contribution score.
- **Commissioner-side "request transfer" for stuck leagues.** Right now
  only the active commissioner can initiate transfer. If they go inactive,
  the league is locked. Admin override exists; member-initiated stale-league
  takeover doesn't.
- **Season rollover automation.** Currently manual via admin panel.
  Could automate the "create next season + mark current" flow with a
  scheduled task once PD2 confirms a season schedule.
- **Trade-aware grail mode.** Right now imports add finds but never remove
  them (correct — items may have been traded away). An opt-in "live mirror"
  mode could show items currently held vs lifetime-found. Major UX shift;
  not aligned with grail-tracker semantics; probably a separate tool.
- **Public read-only API.** A JSON endpoint at `/grail/<username>.json` (or
  similar) would let community tools build dashboards / overlays / Discord
  bots without scraping. Cheap to add; rate-limit needed.
- **Embeddable progress widget.** A small iframe-able badge or
  `<img src="https://pd2grail.com/badge/<username>.svg">` for streamers
  and Discord profile cards.
