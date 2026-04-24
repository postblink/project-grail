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

export type PD2TokenResult =
  | { token: string; needsRelink: false }
  | { token: null; needsRelink: boolean };

export async function getPD2Token(userId: string): Promise<PD2TokenResult> {
  const account = await db.account.findFirst({
    where: { userId, provider: "pd2" },
    select: { id: true, access_token: true, refresh_token: true, expires_at: true },
  });

  if (!account?.access_token) return { token: null, needsRelink: false };

  const isExpired =
    account.expires_at !== null &&
    account.expires_at < Math.floor(Date.now() / 1000);

  if (!isExpired) return { token: account.access_token, needsRelink: false };

  if (account.refresh_token) {
    const refreshed = await refreshToken(account.id, account.refresh_token);
    if (refreshed) return { token: refreshed, needsRelink: false };
  }

  return { token: null, needsRelink: true };
}
