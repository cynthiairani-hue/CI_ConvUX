/**
 * Cube Cloud integration config (server-only).
 *
 * Real data is OFF unless these env vars are present. The deployed Vercel demo
 * has no Cube env vars → isCubeConfigured() is false → the app falls back to
 * mock seed data. Set these in `.env.local` (gitignored, local dev only) to
 * pull real metrics — never commit the token, never add it to Vercel.
 *
 * Every measure/dimension name is overridable via env so you can map your Cube
 * semantic model without editing code. Defaults are placeholders.
 */

export interface CubeConfig {
  apiUrl: string; // e.g. https://<deployment>.cubecloud.dev/cubejs-api/v1
  apiToken: string; // Cube API token (JWT) — secret
  measures: {
    spend: string;
    revenue: string;
    conversions: string;
    cpa?: string; // optional; derived as spend/conversions when absent
  };
  dimensions: {
    channel: string;
  };
  timeDimension: string;
}

export function getCubeConfig(): CubeConfig | null {
  const apiUrl = process.env.CUBE_API_URL;
  const apiToken = process.env.CUBE_API_TOKEN;
  if (!apiUrl || !apiToken) return null;

  const spend = process.env.CUBE_MEASURE_SPEND || "marketing.spend";
  const revenue = process.env.CUBE_MEASURE_REVENUE || "marketing.revenue";
  const conversions = process.env.CUBE_MEASURE_CONVERSIONS || "marketing.conversions";
  const channel = process.env.CUBE_DIM_CHANNEL || "marketing.channel";
  const timeDimension = process.env.CUBE_TIME_DIMENSION || "marketing.date";
  const cpa = process.env.CUBE_MEASURE_CPA || undefined;

  return {
    apiUrl: apiUrl.replace(/\/$/, ""),
    apiToken,
    measures: { spend, revenue, conversions, cpa },
    dimensions: { channel },
    timeDimension,
  };
}

export function isCubeConfigured(): boolean {
  return getCubeConfig() !== null;
}
