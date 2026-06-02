/**
 * Client performance data accessor.
 *
 * Reads the committed, SYNTHETIC fixture (`client-data.json`) — real-shaped
 * numbers with no real customer figures, safe to ship to Vercel. In a secure
 * company (SemanticSugar) context, the real snapshot tool regenerates that file
 * with real data before an internal-only build; the app code is identical.
 *
 * Keyed by Brainlabs roster client id (see src/data/seed-agency.ts).
 */
import raw from "./client-data.json";

export interface ClientChannelData {
  channel: string; // platform channel: Google, Social, Display, LinkedIn, …
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
  cpa: number;
}

export interface ClientMonthly {
  month: string; // "YYYY-MM"
  cost: number;
  conversions: number;
  revenue: number;
}

export interface ClientTotals {
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
  cpa: number;
}

export interface ClientData {
  totals: ClientTotals;
  channels: ClientChannelData[];
  monthly: ClientMonthly[];
}

interface ClientDataFile {
  generatedAt: string;
  synthetic?: boolean;
  windowDays: number;
  monthsBack: number;
  clients: Record<string, ClientData>;
}

const FILE = raw as ClientDataFile;

/** Performance data for a roster client, or null if we have none for it. */
export function getClientData(clientId: string): ClientData | null {
  return FILE.clients[clientId] ?? null;
}

/** True when the loaded fixture is synthetic (the default shipped state). */
export function isSyntheticData(): boolean {
  return FILE.synthetic === true;
}

/** Approx. monthly spend for a client (window cost ÷ months), for budget anchors. */
export function clientMonthlySpend(clientId: string): number | null {
  const d = getClientData(clientId);
  if (!d) return null;
  const months = FILE.windowDays / 30;
  return Math.round(d.totals.cost / Math.max(1, months));
}

/** Everything the media-plan builder needs to anchor a plan to real performance. */
export interface ClientAnchor {
  monthlyBudget: number;
  blendedRoas: number;
  blendedCpa: number;
  /** Top platform channels by spend share (0–1), with their ROAS. */
  channels: { channel: string; spendShare: number; roas: number }[];
}

export function getClientAnchor(clientId: string): ClientAnchor | null {
  const d = getClientData(clientId);
  if (!d || d.totals.cost <= 0) return null;
  const months = Math.max(1, FILE.windowDays / 30);
  const channels = d.channels
    .map((c) => ({ channel: c.channel, spendShare: c.cost / d.totals.cost, roas: c.roas }))
    .sort((a, b) => b.spendShare - a.spendShare);
  return {
    monthlyBudget: Math.round(d.totals.cost / months),
    blendedRoas: d.totals.roas,
    blendedCpa: d.totals.cpa,
    channels,
  };
}
