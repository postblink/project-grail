import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PROTECTED = ["/dashboard", "/grail", "/leagues/create", "/admin"];
const ADMIN_ONLY = ["/admin"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (isProtected && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  const isAdmin = ADMIN_ONLY.some((p) => pathname.startsWith(p));
  if (isAdmin && !session?.user.is_admin) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
