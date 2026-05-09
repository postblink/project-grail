import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

// Paths under /leagues/* that are auth-required (write actions, members-only views).
// Everything else under /leagues/* (browse list, league overview, leaderboard,
// activity feed, missing items) is public per DESIGN.md §"Public leagues".
const LEAGUE_AUTH_RE = /^\/leagues\/(create|[^/]+\/(team|settings))(\/|$)/;

const PROTECTED = ["/dashboard", "/admin", "/settings", "/achievements"];
const ADMIN_ONLY = ["/admin"];

function isLeagueAuthPath(pathname: string): boolean {
  return LEAGUE_AUTH_RE.test(pathname);
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Redirect authenticated users away from the login page
  if (pathname === "/login" && session) {
    const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") ?? "/dashboard";
    return NextResponse.redirect(new URL(callbackUrl, req.url));
  }

  // /grail is the authenticated user's own grail; /grail/[username] is public
  const isProtected =
    pathname === "/grail" ||
    PROTECTED.some((p) => pathname.startsWith(p)) ||
    isLeagueAuthPath(pathname);
  if (isProtected && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  const isAdmin = ADMIN_ONLY.some((p) => pathname.startsWith(p));
  if (isAdmin && !session?.user.is_admin) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Pass pathname downstream so the (app) layout can decide whether to redirect
  // when no session is present (it must, for non-public routes).
  const res = NextResponse.next();
  res.headers.set("x-pathname", pathname);
  return res;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
