import { NextRequest, NextResponse } from "next/server";

/**
 * Optional password gate (HTTP Basic Auth), controlled by the `SITE_PASSWORD`
 * env var. When set (e.g. on the personal/portfolio deployment), the whole site
 * prompts for a password. When unset (e.g. the open internal demo, or local
 * dev), the middleware is a no-op. Same codebase, per-deployment behavior.
 */
export function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next(); // not gated

  const auth = req.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      try {
        const decoded = atob(encoded); // "user:pass"
        const provided = decoded.slice(decoded.indexOf(":") + 1);
        if (provided === password) return NextResponse.next();
      } catch {
        // fall through to 401
      }
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Protected", charset="UTF-8"' },
  });
}

export const config = {
  // Gate everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
