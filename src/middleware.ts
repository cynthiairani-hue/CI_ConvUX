import { NextRequest, NextResponse } from "next/server";
import { getSitePassword } from "@/lib/site-password";

/**
 * Optional site-wide password gate, controlled by the `SITE_PASSWORD` env var.
 *
 * When SITE_PASSWORD is set (e.g. the personal/portfolio deployment), every
 * route is gated server-side: an unauthenticated visitor is REDIRECTED to the
 * styled `/unlock` screen and never sees the landing page or the app. Entering
 * the correct password sets the `fuseiq_unlock` cookie (see /api/unlock), after
 * which the middleware lets them through.
 *
 * When SITE_PASSWORD is unset (the open internal demo, or local dev), this is a
 * no-op. Same codebase, per-deployment behavior.
 */
const COOKIE_NAME = "fuseiq_unlock";

export function middleware(req: NextRequest) {
  const password = getSitePassword();
  if (!password) return NextResponse.next(); // not gated (local dev)

  const { pathname } = req.nextUrl;

  // Always allow the unlock screen + its API through, or it'd redirect-loop.
  if (pathname === "/unlock" || pathname === "/api/unlock") {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie && cookie === password) {
    return NextResponse.next(); // already unlocked
  }

  // Not unlocked → send to the password screen. Preserve where they were
  // headed so we can bounce them back after a correct password.
  const url = req.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = "";
  if (pathname !== "/") {
    url.searchParams.set("next", pathname);
  }
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything EXCEPT Next's static assets (needed to render /unlock)
  // and the favicon. Pages and API routes are still gated by the cookie check.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
