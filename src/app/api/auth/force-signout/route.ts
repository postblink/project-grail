import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const base = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

  // Clear all NextAuth session cookies (v4 and v5 names)
  for (const name of [
    "authjs.session-token",
    "next-auth.session-token",
    "__Secure-authjs.session-token",
    "__Secure-next-auth.session-token",
    "authjs.csrf-token",
    "next-auth.csrf-token",
  ]) {
    cookieStore.delete(name);
  }

  return NextResponse.redirect(`${base}/login`);
}
