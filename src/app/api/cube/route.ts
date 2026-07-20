import { NextResponse } from "next/server";
import { getCubeConfig, type CubeConfig } from "@/lib/cube/config";
import { adaptCubeToPerformance } from "@/lib/cube/adapter";

/**
 * Server-side proxy to Cube Cloud's REST API.
 *
 * - The Cube API token lives only in env (server) and never reaches the browser.
 * - This is NOT an open query proxy: callers request a *named* report and the
 *   query is built here from the configured semantic-model names. That keeps the
 *   surface small and safe.
 * - When Cube isn't configured (e.g. the public Vercel demo), returns
 *   { configured: false } so the client falls back to mock seed data.
 */

export const dynamic = "force-dynamic";

interface CubeLoadResponse {
  data?: Record<string, string | number | null>[];
  error?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// How long to keep polling a cold/warming query before giving up (ms).
const CUBE_MAX_WAIT_MS = 25_000;
// Delay between polls while Cube returns "Continue wait" (ms).
const CUBE_POLL_INTERVAL_MS = 2_000;

async function cubeLoad(cfg: CubeConfig, query: unknown): Promise<CubeLoadResponse> {
  // Cube's REST API returns HTTP 200 with { error: "Continue wait" } while a
  // (cold) query is still computing — it's meant to be re-polled, not treated
  // as done. We poll until the query resolves or we hit CUBE_MAX_WAIT_MS, then
  // surface the wait so the caller can fall back to mock data.
  const deadline = Date.now() + CUBE_MAX_WAIT_MS;
  while (true) {
    const res = await fetch(`${cfg.apiUrl}/load`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: cfg.apiToken,
      },
      body: JSON.stringify({ query }),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Cube ${res.status}: ${text.slice(0, 200)}`);
    }
    const json = (await res.json()) as CubeLoadResponse;
    if (json.error === "Continue wait" && Date.now() < deadline) {
      await sleep(CUBE_POLL_INTERVAL_MS);
      continue;
    }
    return json;
  }
}

export async function GET(request: Request) {
  const cfg = getCubeConfig();
  if (!cfg) {
    return NextResponse.json({ configured: false });
  }

  const report = new URL(request.url).searchParams.get("report") ?? "monthly-performance";

  try {
    if (report === "monthly-performance") {
      const query = {
        measures: [
          cfg.measures.spend,
          cfg.measures.revenue,
          cfg.measures.conversions,
          ...(cfg.measures.cpa ? [cfg.measures.cpa] : []),
        ],
        dimensions: [cfg.dimensions.channel],
        timeDimensions: [{ dimension: cfg.timeDimension, granularity: "month" }],
        order: { [cfg.timeDimension]: "asc" },
      };
      const json = await cubeLoad(cfg, query);
      const perf = adaptCubeToPerformance(json.data ?? [], cfg);
      return NextResponse.json({ configured: true, report, perf });
    }

    return NextResponse.json({ configured: true, error: `Unknown report: ${report}` }, { status: 400 });
  } catch (err) {
    // Real-data fetch failed — tell the client so it can fall back gracefully.
    return NextResponse.json(
      { configured: true, error: err instanceof Error ? err.message : "Cube request failed" },
      { status: 502 }
    );
  }
}
