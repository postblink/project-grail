import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

type DiscordUser = { id: string; username: string; global_name?: string | null };
type DiscordToken = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("discord_link_state")?.value;
  const userId = cookieStore.get("discord_link_user")?.value;

  cookieStore.delete("discord_link_state");
  cookieStore.delete("discord_link_user");

  const base = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const settingsUrl = `${base}/settings`;

  if (!code || !state || state !== storedState || !userId) {
    return NextResponse.redirect(`${settingsUrl}?link_error=invalid_state`);
  }

  // Exchange code for token
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${base}/api/auth/link/discord/callback`,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${settingsUrl}?link_error=token_exchange`);
  }

  let tokenData: DiscordToken;
  try {
    tokenData = (await tokenRes.json()) as DiscordToken;
  } catch {
    return NextResponse.redirect(`${settingsUrl}?link_error=token_exchange`);
  }

  // Fetch Discord user profile
  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(`${settingsUrl}?link_error=fetch_user`);
  }

  let discordUser: DiscordUser;
  try {
    discordUser = (await userRes.json()) as DiscordUser;
  } catch {
    return NextResponse.redirect(`${settingsUrl}?link_error=fetch_user`);
  }

  // Read current user's display_name before entering the transaction
  const currentUser = await db.user.findUnique({
    where: { id: userId },
    select: { display_name: true },
  });

  // Create the account link and update discord_id.
  // The unique constraint on (provider, providerAccountId) guards against races —
  // catch P2002 and treat it as already_linked.
  try {
    await db.$transaction([
      db.account.create({
        data: {
          userId,
          type: "oauth",
          provider: "discord",
          providerAccountId: discordUser.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token ?? null,
          expires_at: tokenData.expires_in
            ? Math.floor(Date.now() / 1000) + tokenData.expires_in
            : null,
          token_type: tokenData.token_type ?? null,
          scope: tokenData.scope ?? null,
        },
      }),
      db.user.update({
        where: { id: userId },
        data: {
          discord_id: discordUser.id,
          ...((!currentUser?.display_name && (discordUser.global_name ?? discordUser.username))
            ? { display_name: discordUser.global_name ?? discordUser.username }
            : {}),
        },
      }),
    ]);
  } catch (err: unknown) {
    // P2002 = unique constraint violation — Discord account already linked to another user
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.redirect(`${settingsUrl}?link_error=already_linked`);
    }
    console.error("Discord link transaction failed:", err);
    return NextResponse.redirect(`${settingsUrl}?link_error=server`);
  }

  return NextResponse.redirect(`${settingsUrl}?link_success=1`);
}
