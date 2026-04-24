import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

export async function GET() {
  const session = await auth();
  const base = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

  if (!session?.user.id) {
    return NextResponse.redirect(`${base}/login`);
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();

  cookieStore.set("discord_link_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  cookieStore.set("discord_link_user", session.user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    redirect_uri: `${base}/api/auth/link/discord/callback`,
    response_type: "code",
    scope: "identify email",
    state,
  });

  return NextResponse.redirect(`https://discord.com/oauth2/authorize?${params}`);
}
