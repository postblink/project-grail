# Project Grail — Design

Project Grail is a Holy Grail tracker for **Project Diablo 2**. It records seasonal item progress
for individual players and leagues, with user-initiated armory imports to reduce manual entry.

It is PD2-specific. The item catalog follows PD2 data and seasonal changes; it is not a tracker
for Diablo II: Resurrected or vanilla Lord of Destruction.

This document describes the current product. The Prisma schema is the source of truth for stored
data, and routes and library code define request behavior.

## Product model

A grail is a checklist of active PD2 items. Items are classified as unique, set, runeword, rune,
or other. Each found entry records whether an item is found, when it was found, and whether it was
recorded manually or through an armory import.

Grails are scoped to a season. The data model also supports an all-time grail without a season.
Items and historical records are retained when a season changes; inactive items leave current views
without erasing old progress.

## Accounts and access

Authentication uses NextAuth.js v5:

- Discord OAuth is the primary sign-in path.
- Resend magic links provide email sign-in.
- The application does not use password authentication.
- A Discord account can link to an existing email account only when the verified email addresses
  match.

Users can set a display name and opt out of public profiles. Public grails use
`/grail/<username>`. Administrative routes require a server-side `is_admin` check.

## Solo grails

A player can maintain a current seasonal grail, filter its checklist, and mark items found or not
found. Grail views provide category filtering, progress totals, found timestamps, item wiki links,
and public sharing for public accounts.

Achievements record progress milestones, first finds, category milestones, and set completions.

## Armory import

Armory import is a user-initiated snapshot. It is not background synchronization and it never
removes an existing find.

The import flow:

1. Fetches one or more named characters from the PD2 character API.
2. Reads qualifying unique, set, runeword, rune, mercenary, and socketed item data exposed by that
   API.
3. Includes shared-stash data when the user has the required PD2 access.
4. Matches imported names against active items in the local PD2 catalog.
5. Shows new items, already-found items, unmatched names, failed characters, and stash status.
6. Requires confirmation before writing finds.

Confirmation validates the submitted item IDs and grail ownership on the server. It writes finds
only; an item missing from a later character or stash snapshot does not clear prior progress.

## Leagues

Leagues are seasonal groups with a commissioner, members, a grail scope, privacy setting, invite
code, ladder mode, and optional Discord webhook.

| Type | Behavior |
| --- | --- |
| Cooperative | Members contribute discoveries to one shared team grail. |
| Competitive | Members keep individual grails and are ranked by personal progress. |
| Hybrid | Members keep individual grails; the team view reflects discoveries across those grails. |

League pages provide member and progress summaries, leaderboards where applicable, team-grail and
missing-item views, activity, private invitation handling, and commissioner controls.

For shared team views, a `LeagueGrailEntry` preserves the first finder for each item. Historical
finds remain part of that record even when league membership changes.

## Discord notifications

A league can configure a Discord webhook. Finds are batched instead of posted one at a time.

When qualifying activity occurs, the application creates or updates a pending batch containing the
finder, item names, progress change, milestones, and eligible achievements. A scheduled request to
`/api/cron/discord-flush` sends ready batches. The included GitHub Actions workflow calls that
endpoint every five minutes; another deployment needs an equivalent scheduled request protected by
`CRON_SECRET`.

## Item and season administration

The item catalog is seeded from a Project Diablo 2 wiki snapshot and can be refreshed with the
repository scripts. Administrators manage item activity and season records.

Items are not hard-deleted when they leave the current PD2 pool. `is_active` controls whether an
item appears in new current-season views while preserving historical grail references.

## Data model

| Record | Purpose |
| --- | --- |
| `User` | Account, display name, profile visibility, Discord identity, and admin state. |
| `Season` | Seasonal scope and current-season state. |
| `Item` | PD2 item catalog and category metadata. |
| `Grail` | A user's seasonal or all-time tracker. |
| `GrailEntry` | One item's found state within a grail. |
| `ArmoryImport` | Audit record for an import run. |
| `League` | Seasonal league settings and commissioner. |
| `LeagueMember` | League membership and role. |
| `LeagueGrailEntry` | Shared-team discovery and original finder. |
| `DiscordBatch` | Pending batched Discord notification. |
| `UserAchievement` | An unlocked achievement. |

Auth.js account, session, and verification-token records are stored through the Prisma adapter.

## Stack

| Layer | Implementation |
| --- | --- |
| Application | Next.js 16 App Router |
| Language | TypeScript |
| UI | React 19 and Tailwind CSS |
| Database | PostgreSQL |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Authentication | NextAuth.js v5 |
| Email | Resend |
| Monitoring | Optional Sentry integration |
| Analytics | Vercel Web Analytics integration |

The reference deployment uses Vercel for the application and Railway for PostgreSQL. The app only
requires a compatible Node.js host and PostgreSQL database.

## Operational rules

### No trade-site integration

Project Grail does not query, scrape, or automate the PD2 trade site. It has no public API, and
programmatic use risks bans for players.

### No automatic armory polling

Armory and shared-stash reads begin with the user. Project Grail records discoveries; it is not a
continuously synchronized inventory.

### Found means found

A grail records discoveries, not current possession. Trading, dropping, or moving an item after it
was found does not invalidate the entry.

### Preserve historical records

Do not delete items, entries, seasons, or team-discovery history just because they are no longer
current. Use active-state and archival behavior instead.

### Validate server-side

Routes validate input before database writes. Protected routes authenticate on the server and
enforce commissioner or administrator permissions where required.

## Explicit non-goals

- PD2 trade-site integration.
- Background armory polling.
- Password-based sign-in.
- Clearing finds from later import snapshots.
- D2R or vanilla LoD support.
