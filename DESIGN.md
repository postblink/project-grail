# PD2 Grail Tracker — Design Document

## Overview

A web application for tracking Holy Grail progress in **Project Diablo 2 (PD2)**, a community-run seasonal mod for Diablo II: Lord of Destruction. Players manually check off unique, set, and other item categories as they find them in-game. The app supports both solo grail tracking and team-based league play, where groups of friends can run cooperative or competitive grail seasons together.

PD2 is a free mod played on the developer's own servers (not Battle.net). Online ladder characters are **server-side only** — there are no local save files to parse. All grail progress must be entered manually by the user.

---

## Target Audience

- Active PD2 ladder players (online, seasonal)
- Friend groups and guilds who want to race or cooperate toward grail completion
- Streamers tracking visible grail progress for their audience
- PD2 singleplayer / PlugY players (secondary; save-file parsing is a future feature)

---

## Core Concepts

### The Holy Grail
The Holy Grail challenge is a self-imposed endgame goal: find every unique and set item in the game. PD2 extends the vanilla item pool with PD2-exclusive unique items, reworked sets, new runewords, and season-specific drops. A PD2 grail tracker must reflect PD2's actual item pool, not vanilla LoD or D2 Resurrected.

### Seasons
PD2 resets its ladder every ~4 months with new balance patches and content. Grail progress is inherently seasonal. The app must support:
- Per-season grails (start fresh each ladder reset)
- An optional persistent all-time grail that accumulates across seasons
- Season-labeled history so past progress is never lost

### Leagues
Leagues are the social/competitive layer. A league is a named group with its own grail season, scope settings, and leaderboard. Members track their own individual grails within the league context. The league also maintains a combined "team found" view showing which items any member has found.

---

## Feature Specification

### 1. Authentication

- Sign in with Discord (primary) — OAuth via NextAuth.js Discord provider
- Magic link email (fallback) — for users without Discord; NextAuth.js Email provider
- Display name pulled from Discord username by default, editable after first login
- Public profile URL: `/grail/{username}` — shareable, readable without login
- No passwords stored at any point

### 2. Item Database

The item database is the backbone of the app. It is seeded from the PD2 wiki and updated each season.

**Item fields:**
```
id              — internal identifier
name            — display name (e.g. "Griffon's Eye")
category        — unique | set | runeword | rune | other
item_type       — helm | body_armor | weapon | ring | amulet | charm | etc.
set_name        — for set items: the parent set (e.g. "Tal Rasha's Wrappings")
pd2_exclusive   — boolean: is this item added/unique to PD2?
season_introduced — which PD2 season this item first appeared (null = vanilla LoD)
is_active       — boolean: is this item in the current season?
wiki_url        — link to PD2 wiki entry
```

**Initial seed source:** `wiki.projectdiablo2.com/wiki/All_Items`

**Admin interface:** A lightweight admin panel (accessible only to app admin accounts) allows updating the item database between seasons via JSON import, without requiring a code deploy.

**Item categories tracked (user-configurable per grail):**
- Unique items (always included)
- Set items
- Runewords
- PD2-exclusive items (flagged separately for filtering)
- Runes (optional — some grail communities include rune collection)

### 3. Solo Grail

Each registered user has one active grail per season. When a new season begins, users are prompted to start a fresh season grail. Prior season grails are archived and viewable but locked.

**Grail record per item:**
```
user_id
item_id
season
found          — boolean
found_at       — timestamp (when the user checked it off)
ethereal       — boolean (optional)
notes          — free text (optional, e.g. "dropped from Mephisto, Day 4")
```

**Grail views:**
- Full checklist (filterable by category, type, found/not-found, PD2-exclusive)
- Progress summary: overall %, per-category %, items found this week
- Rarity view: items ranked by how rarely they appear in the community's collective grail data
- Historical view: past season grails

**Public profile page (`/grail/{username}`):**
- Displays current season grail progress
- Shows percentage complete, recent finds, rarest item found
- Shareable link — no login required to view

### 4. Leagues

#### Creating a League
Any user can create a league. The creator becomes the **Commissioner** and can manage membership and settings.

**League settings:**
```
name                — display name
slug                — URL-friendly identifier (/league/{slug})
season              — which PD2 season this league runs in
ladder_mode         — softcore_ladder | hardcore_ladder | softcore_nonladder | hardcore_nonladder
league_type         — cooperative | competitive | hybrid (see below)
grail_scope         — which item categories count (uniques, sets, runewords, runes, pd2_exclusive)
is_private          — boolean (private leagues require an invite code to join)
invite_code         — auto-generated code for private leagues
start_date          — when the league begins (defaults to season start)
end_date            — optional end date
discord_webhook_url — optional Discord webhook for notifications
```

**League types:**

| Type | Description |
|---|---|
| Cooperative | All members contribute to a single shared team grail. First member to find an item marks it for everyone. |
| Competitive | Each member tracks their own grail independently. Leaderboard shows individual completion %. Race format. |
| Hybrid | Each member has their own grail, plus a combined team view showing which items *any* member has found. Useful for coordinating trades. |

#### Joining a League
- Public leagues: visible in a league directory, joinable with one click
- Private leagues: require an invite code provided by the Commissioner

#### League Views
- **Leaderboard:** Member name, % complete, items found, last active
- **Team Grail (Hybrid/Cooperative):** Combined item checklist. Each item shows who found it and when
- **Activity feed:** Recent finds across all members ("PlayerX found Griffon's Eye — 2 hours ago")
- **Missing items:** Items no member has found yet, sorted by rarity — useful for coordinating farming targets

#### Commissioner Controls
- Invite / remove members
- Change league settings (except season and ladder_mode after league starts)
- Designate co-commissioners
- Archive/close the league at end of season

#### Discord Integration
If a webhook URL is provided, the app posts to the league's Discord channel when:
- A member finds a new grail item
- A member reaches a completion milestone (25%, 50%, 75%, 100%)
- The league leaderboard position changes

### 5. Season Management

**Admin-side:**
- Seasons are managed via the admin panel
- Each season has: name (e.g. "Season 13: Betrayal"), start date, end date, and associated item set
- When a new season is created, the item database can be updated for that season

**User-side:**
- When a new season starts, users with an existing grail see a banner: "Season 13 has started. Start your new season grail?"
- Prior grails are automatically archived
- Users can opt to carry over their all-time grail, which never resets

### 6. Statistics & Rarity

As the user base grows, aggregate data creates community-sourced rarity rankings.

**Tracked statistics:**
- Community completion rate per item (% of users who have found it)
- Average days-to-find per item per season
- Most common "last item found" to complete grail
- Per-user: items found per day/week, estimated time to completion

**Rarity index:** Items are ranked by how rarely they appear across all active grails. This surfaces genuinely rare PD2 drops and is more meaningful than theoretical drop rates.

---

## Data Model (Conceptual)

```
users
  id, email, display_name, password_hash, created_at, is_admin

seasons
  id, name, slug, start_date, end_date, is_active, is_current

items
  id, name, category, item_type, set_name, pd2_exclusive,
  season_introduced, is_active, wiki_url

grails
  id, user_id, season_id, created_at, is_alltime

grail_entries
  id, grail_id, item_id, found, found_at, ethereal, notes

leagues
  id, name, slug, commissioner_id, season_id, league_type,
  ladder_mode, grail_scope, is_private, invite_code,
  start_date, end_date, discord_webhook_url, created_at

league_members
  id, league_id, user_id, joined_at, role (member | co-commissioner | commissioner)

league_grail_entries
  id, league_id, item_id, found_by_user_id, found_at
  -- used for cooperative leagues and the hybrid team view
```

---

## URL Structure

```
/                          — landing page / marketing
/login                     — login
/register                  — registration
/dashboard                 — user's active grail + league overview (auth required)
/grail                     — current season grail (auth required)
/grail/history             — past season grails (auth required)
/grail/{username}          — public profile (no auth required)
/leagues                   — browse public leagues
/leagues/create            — create a league (auth required)
/leagues/{slug}            — league overview (public)
/leagues/{slug}/grail      — user's grail within league context (auth required)
/leagues/{slug}/leaderboard
/leagues/{slug}/team       — team combined grail view
/leagues/{slug}/activity   — activity feed
/leagues/{slug}/settings   — commissioner settings (auth + commissioner required)
/admin                     — admin panel (admin role required)
/admin/items               — item database management
/admin/seasons             — season management
```

---

## Tech Stack (Recommended)

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Next.js (App Router) | SSR for public grail pages, React for interactive checklist |
| Styling | Tailwind CSS | Fast iteration, good dark mode support |
| Backend | Next.js API Routes | Keeps stack unified; move to separate service later if needed |
| Database | PostgreSQL | Relational model fits the data well |
| ORM | Prisma | Type-safe, good migration tooling |
| Auth | NextAuth.js | Email/password + future OAuth support |
| Hosting | Vercel (frontend) + Supabase or Railway (Postgres) | Low-friction deployment |
| Email | Resend or Postmark | Password reset, optional find notifications |

### Alternative if preferring a more minimal stack:
- SvelteKit instead of Next.js
- SQLite (via Turso or local) for a simpler start

---

## MVP Scope

The following constitutes a shippable v1:

1. User registration and login
2. Item database seeded from PD2 wiki (current season)
3. Solo grail: manual check-off with found timestamp
4. Grail views: full checklist, progress %, filter by category
5. Public shareable profile page
6. League creation with competitive and hybrid modes
7. League leaderboard
8. Team found view (hybrid leagues)
9. Basic activity feed (league-scoped)
10. Admin panel: season and item management

**Deferred to v2:**
- Discord webhook integration
- Rarity analytics / community statistics
- Ethereal tracking
- Item notes
- Cooperative league type
- Save file parsing (for singleplayer/PlugY users)
- Mobile-optimized UI improvements
- OBS browser source feed for streamers

---

## Non-Goals (Explicit)

- **No trade site integration.** The official PD2 trade site has no public API and scraping it violates ToS and risks player bans. This app does not interface with the trade site in any way.
- **No automated item detection.** Online ladder characters have no local save files. All tracking is manual.
- **No real-money trading features.** PD2 rules explicitly forbid RMT; this app will not facilitate it.
- **No D2R or vanilla LoD support.** This app is PD2-specific. Existing tools cover D2R and vanilla.

---

## Open Questions

1. **Grail scope per-user vs per-league:** Should each user define their own grail scope (e.g. "I'm only tracking uniques") or should the league enforce a uniform scope for all members?
2. **Season grail reset behavior:** When a new season starts, should the app auto-create a new season grail or wait for the user to explicitly opt in?
3. **Rune tracking:** Include runes in the grail scope or treat them as a separate challenge?
4. **Ethereal grail:** Some communities track ethereal and non-ethereal versions of the same unique separately (essentially doubling the grail). Support this as an opt-in?
5. **Item variations:** PD2 has items that can be corrupted with variable stats. Does corruption status matter for grail purposes, or is "found the base item" sufficient?

---

## Season Maintenance Notes

PD2 releases a new season roughly every 4 months. Each season may:
- Add new PD2-exclusive unique items
- Remove or rework existing items
- Change item names or stats

When a new season drops, the item database needs to be reviewed and updated before the season goes live. The recommended workflow:
1. Check the PD2 wiki `All_Items` page against the current database
2. Flag new items with `season_introduced = {new_season_id}` and `pd2_exclusive = true`
3. Mark removed items with `is_active = false` (never delete — historical grails reference them)
4. Deploy the item update via the admin JSON import tool
5. Create the new season record in the admin panel to trigger user prompts
