import { NextRequest, NextResponse } from "next/server";
import { getSitePassword } from "@/lib/site-password";

const COOKIE_NAME = "fuseiq_unlock";

/**
 * Validates the site password and, on success, sets the `fuseiq_unlock` cookie
 * that the middleware checks. The password is only ever compared server-side;
 * it is never sent to the client.
 */
export async function POST(req: NextRequest) {
  const password = getSitePassword();

  // If no gate is configured, treat as already unlocked.
  if (!password) {
    return NextResponse.json({ ok: true });
  }

  let provided = "";
  try {
    const body = await req.json();
    provided = typeof body?.password === "string" ? body.password : "";
  } catch {
    provided = "";
  }

  if (provided !== password) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  // SESSION cookie — no maxAge/expires. The browser discards it when the
  // session ends (browser/tab closed), so every fresh visit must re-enter the
  // password. We are NOT remembering visitors across visits.
  res.cookies.set(COOKIE_NAME, password, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
