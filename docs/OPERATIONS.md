# Operations runbook

Known issues, workarounds, and ops recipes. Grows over time — add notes
when you discover something that future-you will forget.

---

## Vercel CLI quirks (≥ 54.1.0)

### Env vars default to `sensitive`, which is write-only

`vercel env add NAME production` (no flags) stores the value as `type:
sensitive`, which Vercel deliberately does not return on subsequent reads.
`vercel env pull` will show `NAME=""` even though the value is correctly set
in Vercel's database — production will receive the real value at runtime.

This is intentional behavior but it's a footgun when verifying changes.

**Workaround:** add with `--no-sensitive` if you want `vercel env pull` to
return the actual value:

```bash
vercel env add EMAIL_FROM production --value noreply@pd2grail.com --no-sensitive
```

Or accept write-only and verify via runtime behavior (e.g., send a test email,
trigger a real auth flow, watch runtime logs).

To check whether an existing var is sensitive or encrypted, query the API:

```bash
VERCEL_TOKEN=$(grep -oE '"token"[^"]*"[^"]+"' ~/.local/share/com.vercel.cli/auth.json | sed 's/.*"\([^"]*\)"$/\1/')
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/<PROJECT_ID>/env?teamId=<TEAM_ID>" | \
  python3 -c "import sys,json;[print(e['key'], e['type']) for e in json.load(sys.stdin)['envs']]"
```

Project + team IDs live in `.vercel/project.json`.

### `vercel env add --value` hangs on values containing `<` or `>`

`vercel env add EMAIL_FROM production --value 'Project Grail <noreply@pd2grail.com>'`
spawns the node process but hangs indefinitely, even with the value
single-quoted. The argv ends up with the bracketed portion treated oddly and
the CLI falls through to interactive mode waiting on stdin, which a
non-interactive context can't satisfy.

**Workarounds, in order of preference:**

1. **Use the Vercel REST API directly** — bypasses the CLI entirely and lets
   you specify `type` (encrypted vs sensitive) cleanly:

   ```bash
   curl -X POST -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
     -d '{"key":"EMAIL_FROM","value":"Project Grail <noreply@pd2grail.com>","type":"encrypted","target":["production"]}' \
     "https://api.vercel.com/v10/projects/<PROJECT_ID>/env?teamId=<TEAM_ID>"
   ```

2. **Use the bare email** (no display name) and let Resend / NextAuth use the
   default presentation. Less branded but the CLI accepts it.

3. **Use the Vercel web dashboard** for one-off updates. The UI doesn't have
   this issue.

### Phantom orphan entries after a failed add

If `vercel env add` partially completes (e.g., killed mid-write), it can leave
an orphan entry that `vercel env ls` may not show but that prevents new adds
with the same key — fails with:

```
{"status":"error","reason":"branch_not_found","message":"A variable with the
name `EMAIL_FROM` already exists for the target production on branch undefined"}
```

`vercel env rm` doesn't always find these orphans either.

**Fix:** list all entries via API to get the orphan's ID, then DELETE by ID:

```bash
# List
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/<PROJECT_ID>/env?teamId=<TEAM_ID>" | \
  python3 -c "import sys,json;[print(e['id'],e['key'],e['target']) for e in json.load(sys.stdin)['envs']]"

# Delete by ID
curl -X DELETE -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/<PROJECT_ID>/env/<ENTRY_ID>?teamId=<TEAM_ID>"
```

---

## Other quirks we know about

### Vercel env pull leaves `\n` artifacts in some values

`vercel env pull .env` sometimes appends literal `\n` to multi-line values
(notably DATABASE_URL from Railway). Always load `.env` via `dotenv` in
scripts (which parses these correctly), never via shell `export` /
`xargs`. The `scripts/*.ts` files all use `import "dotenv/config"` for this
reason.

### Resend API key in production is `send-only`

The production `RESEND_API_KEY` is intentionally scoped to send-only, so it
can't introspect domain status or list past emails. Domain verification and
delivery monitoring happen via the Resend dashboard. The send-only key still
works fine for `scripts/send-test-email.ts`.

### Vercel CLI default still defaults to old version

Vercel CLI ships a permanent "Update available" banner. The current minimum
we've verified working is 54.1.0. Upgrade with:

```bash
npm i -g vercel@latest
```

---

## Ops recipes

### Send a test email through the production template

```bash
cp .env.prod .env   # from the project root (one-off, never commit)
npx tsx --tsconfig tsconfig.scripts.json scripts/send-test-email.ts <recipient>
rm .env
```

### Apply a pending Prisma migration to prod

Migrations run automatically on the build server via the `postinstall` hook
(`prisma generate`) and `prisma migrate deploy`. To run manually:

```bash
cp .env.prod .env
npx prisma migrate deploy
rm .env
```

### Manually fire the Discord-flush cron

Two ways:

```bash
# Via gh CLI
gh workflow run "Discord batch flush"

# Via curl
curl -H "Authorization: Bearer $CRON_SECRET" https://pd2grail.com/api/cron/discord-flush
```

### Roll a deploy back

```bash
vercel rollback <previous-deployment-url>
# or just redeploy a known-good SHA:
git checkout <good-sha>
vercel --prod
git checkout main
```
