import { db } from "@/lib/db";

interface RefreshResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

async function refreshToken(accountId: string, refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.projectdiablo2.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.PD2_CLIENT_ID!,
        client_secret: process.env.PD2_CLIENT_SECRET!,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as RefreshResponse;
    await db.account.update({
      where: { id: accountId },
      data: {
        access_token: data.access_token,
        refresh_token: data.refresh_token ?? refreshToken,
        expires_at: data.expires_in
          ? Math.floor(Date.now() / 1000) + data.expires_in
          : null,
      },
    });
    return data.access_token;
  } catch (err) {
    console.error("PD2 token refresh failed:", err);
    return null;
  }
}

export async function getPD2Characters(username: string): Promise<string[] | null> {
  try {
    const res = await fetch(`https://api.projectdiablo2.com/game/account/${encodeURIComponent(username)}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { characters?: string[] };
    return data.characters ?? [];
  } catch {
    return null;
  }
}

export type PD2TokenResult =
  | { token: string; username: string; sub: string; needsRelink: false }
  | { token: null; username: null; sub: null; needsRelink: boolean };

// MongoDB ObjectIDs are 24 hex chars — if providerAccountId looks like one,
// it's a pre-fix record that stored sub instead of username.
function looksLikeObjectId(s: string) {
  return /^[0-9a-f]{24}$/.test(s);
}

async function resolveUsername(token: string, accountId: string, storedId: string): Promise<string> {
  if (!looksLikeObjectId(storedId)) return storedId;
  try {
    const res = await fetch("https://api.projectdiablo2.com/oauth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return storedId;
    const data = (await res.json()) as { name?: string };
    if (!data.name || data.name === storedId) return storedId;
    await db.account.update({ where: { id: accountId }, data: { providerAccountId: data.name } });
    return data.name;
  } catch {
    return storedId;
  }
}

// Resolves the OAuth sub (MongoDB ObjectID) needed for the stash endpoint.
// New accounts have it stored in id_token; older accounts fall back to /oauth/me
// and cache the result.
async function resolveOAuthSub(token: string, accountId: string, storedSub: string | null): Promise<string | null> {
  if (storedSub) return storedSub;
  try {
    const res = await fetch("https://api.projectdiablo2.com/oauth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { sub?: string };
    if (!data.sub) return null;
    await db.account.update({ where: { id: accountId }, data: { id_token: data.sub } });
    return data.sub;
  } catch {
    return null;
  }
}

export async function getPD2Token(userId: string): Promise<PD2TokenResult> {
  const account = await db.account.findFirst({
    where: { userId, provider: "pd2" },
    select: { id: true, access_token: true, refresh_token: true, expires_at: true, providerAccountId: true, id_token: true },
  });

  if (!account?.access_token) return { token: null, username: null, sub: null, needsRelink: false };

  const isExpired =
    account.expires_at !== null &&
    account.expires_at < Math.floor(Date.now() / 1000);

  if (!isExpired) {
    const username = await resolveUsername(account.access_token, account.id, account.providerAccountId);
    const sub = await resolveOAuthSub(account.access_token, account.id, account.id_token ?? null);
    return { token: account.access_token, username, sub: sub ?? username, needsRelink: false };
  }

  if (account.refresh_token) {
    const refreshed = await refreshToken(account.id, account.refresh_token);
    if (refreshed) {
      const username = await resolveUsername(refreshed, account.id, account.providerAccountId);
      const sub = await resolveOAuthSub(refreshed, account.id, account.id_token ?? null);
      return { token: refreshed, username, sub: sub ?? username, needsRelink: false };
    }
  }

  return { token: null, username: null, sub: null, needsRelink: true };
}
