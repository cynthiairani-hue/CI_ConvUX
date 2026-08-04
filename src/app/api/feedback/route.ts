import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

/* ── Feedback collection ──
   Visitors behind the password gate can leave name + feedback; entries are
   stored as JSON blobs in Vercel Blob (the deployment's only storage) and
   read back on /feedback. Both verbs sit behind the site gate via middleware.
   Locally (no BLOB token) the API answers 503 and the UI says so honestly. */

interface FeedbackEntry {
  name: string;
  message: string;
  date: string;
  path?: string;
}

const configured = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export async function POST(req: NextRequest) {
  if (!configured()) {
    return NextResponse.json({ ok: false, reason: "storage-not-configured" }, { status: 503 });
  }
  let body: { name?: string; message?: string; path?: string } = {};
  try {
    body = await req.json();
  } catch { /* fall through to validation */ }
  const name = (body.name ?? "").trim().slice(0, 80);
  const message = (body.message ?? "").trim().slice(0, 4000);
  if (!name || !message) {
    return NextResponse.json({ ok: false, reason: "name-and-message-required" }, { status: 400 });
  }
  const entry: FeedbackEntry = {
    name,
    message,
    date: new Date().toISOString(),
    path: typeof body.path === "string" ? body.path.slice(0, 200) : undefined,
  };
  await put(`feedback/${Date.now()}.json`, JSON.stringify(entry), {
    access: "public",
    addRandomSuffix: true,
    contentType: "application/json",
  });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  if (!configured()) {
    return NextResponse.json({ ok: false, entries: [], reason: "storage-not-configured" }, { status: 503 });
  }
  const { blobs } = await list({ prefix: "feedback/", limit: 200 });
  const sorted = [...blobs].sort((a, b) => (a.pathname < b.pathname ? 1 : -1)); // newest first (ts filenames)
  const entries: FeedbackEntry[] = [];
  for (const b of sorted.slice(0, 100)) {
    try {
      const res = await fetch(b.url);
      entries.push((await res.json()) as FeedbackEntry);
    } catch { /* skip unreadable blob */ }
  }
  return NextResponse.json({ ok: true, entries });
}
