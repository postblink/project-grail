import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

type PD2Token = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};
type PD2User = { sub: string; name: string };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("pd2_link_state")?.value;
  const userId = cookieStore.get("pd2_link_user")?.value;

  cookieStore.delete("pd2_link_state");
  cookieStore.delete("pd2_link_user");

  const base = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const settingsUrl = `${base}/settings`;

  if (!code || !state || state !== storedState || !userId) {
    return NextResponse.redirect(`${settingsUrl}?link_error=invalid_state`);
  }

  const tokenRes = await fetch("https://api.projectdiablo2.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.PD2_CLIENT_ID!,
      client_secret: process.env.PD2_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${base}/api/auth/callback/pd2`,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${settingsUrl}?link_error=token_exchange`);
  }

  let tokenData: PD2Token;
  try {
    tokenData = (await tokenRes.json()) as PD2Token;
  } catch {
    return NextResponse.redirect(`${settingsUrl}?link_error=token_exchange`);
  }

  const userRes = await fetch("https://api.projectdiablo2.com/oauth/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(`${settingsUrl}?link_error=fetch_user`);
  }

  let pd2User: PD2User;
  try {
    pd2User = (await userRes.json()) as PD2User;
  } catch {
    return NextResponse.redirect(`${settingsUrl}?link_error=fetch_user`);
  }

  const currentUser = await db.user.findUnique({
    where: { id: userId },
    select: { display_name: true },
  });

  try {
    await db.$transaction([
      db.account.create({
        data: {
          userId,
          type: "oauth",
          provider: "pd2",
          providerAccountId: pd2User.name,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token ?? null,
          expires_at: tokenData.expires_in
            ? Math.floor(Date.now() / 1000) + tokenData.expires_in
            : null,
          token_type: tokenData.token_type ?? null,
          scope: tokenData.scope ?? null,
          id_token: pd2User.sub,
        },
      }),
      db.user.update({
        where: { id: userId },
        data: {
          ...(!currentUser?.display_name && pd2User.name
            ? { display_name: pd2User.name }
            : {}),
        },
      }),
    ]);
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return NextResponse.redirect(`${settingsUrl}?link_error=already_linked`);
    }
    console.error("PD2 link transaction failed:", err);
    return NextResponse.redirect(`${settingsUrl}?link_error=server`);
  }

  return NextResponse.redirect(`${settingsUrl}?link_success=1`);
}
