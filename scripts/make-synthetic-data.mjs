/**
 * Synthetic client data generator — SAFE, self-contained, NO warehouse access.
 *
 * Produces `src/data/client-data.json` (committed, ships to Vercel) with
 * plausible, real-SHAPED numbers for the Brainlabs demo clients: realistic
 * channel mixes, ROAS ranges, CPAs, and a 6-month trend. None of these are real
 * customer figures — they're fabricated from encoded profiles below, so nothing
 * proprietary ever leaves the warehouse. This is the data the shared demo uses.
 *
 * (The separate scripts/cube-snapshot.mjs writes the gitignored REAL fixture for
 * secure/company contexts only; the app prefers that when present.)
 *
 * Usage:  node scripts/make-synthetic-data.mjs
 */
import { writeFileSync } from "fs";

// Deterministic PRNG so the committed fixture is stable across runs.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// Encoded per-client profiles — realistic structure, fabricated magnitudes.
// share = fraction of monthly spend; roas/cpa are channel-typical anchors.
const PROFILES = {
  "client-estee": { monthlyBudget: 180000, cpm: 9.5, ctr: 0.0042,
    channels: { Google: { share: 0.62, roas: 6.5, cpa: 42 }, Display: { share: 0.23, roas: 5.1, cpa: 55 }, Social: { share: 0.15, roas: 4.2, cpa: 61 } } },
  "client-vans": { monthlyBudget: 95000, cpm: 7.2, ctr: 0.0061,
    channels: { Google: { share: 0.55, roas: 8.1, cpa: 18 }, Social: { share: 0.28, roas: 6.4, cpa: 24 }, Display: { share: 0.17, roas: 5.5, cpa: 29 } } },
  "client-harrods": { monthlyBudget: 120000, cpm: 11.0, ctr: 0.0035,
    channels: { Social: { share: 0.58, roas: 1.6, cpa: 88 }, Display: { share: 0.27, roas: 2.1, cpa: 74 }, Google: { share: 0.15, roas: 2.8, cpa: 65 } } },
  "client-simplybusiness": { monthlyBudget: 40000, cpm: 8.0, ctr: 0.0048,
    channels: { Google: { share: 0.38, roas: 1.1, cpa: 52 }, Social: { share: 0.26, roas: 0.7, cpa: 64 }, LinkedIn: { share: 0.22, roas: 0.9, cpa: 120 }, Display: { share: 0.14, roas: 0.6, cpa: 78 } } },
  "client-expedia": { monthlyBudget: 60000, cpm: 6.5, ctr: 0.0055,
    channels: { Google: { share: 0.6, roas: 7.2, cpa: 22 }, Display: { share: 0.4, roas: 6.1, cpa: 28 } } },
};

const MONTHS = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
const round = (n) => Math.round(n * 100) / 100;
const jitter = (rnd, base, pct) => base * (1 + (rnd() * 2 - 1) * pct);

function buildClient(id, p) {
  const rnd = mulberry32(hashSeed(id));
  // Per-channel aggregates across the window + monthly totals.
  const chAgg = {};
  for (const name of Object.keys(p.channels)) chAgg[name] = { cost: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
  const monthly = [];

  MONTHS.forEach((month, i) => {
    // Mild upward trend over the 6 months + noise.
    const trend = 0.9 + 0.04 * i;
    const monthBudget = jitter(rnd, p.monthlyBudget * trend, 0.08);
    let mCost = 0, mConv = 0, mRev = 0;
    for (const [name, c] of Object.entries(p.channels)) {
      const cost = jitter(rnd, monthBudget * c.share, 0.12);
      const roas = jitter(rnd, c.roas, 0.1);
      const cpa = jitter(rnd, c.cpa, 0.1);
      const revenue = cost * roas;
      const conversions = cost / cpa;
      const impressions = (cost / p.cpm) * 1000;
      const clicks = impressions * jitter(rnd, p.ctr, 0.1);
      const a = chAgg[name];
      a.cost += cost; a.revenue += revenue; a.conversions += conversions; a.impressions += impressions; a.clicks += clicks;
      mCost += cost; mRev += revenue; mConv += conversions;
    }
    monthly.push({ month, cost: round(mCost), conversions: Math.round(mConv), revenue: round(mRev) });
  });

  const channels = Object.entries(chAgg)
    .map(([channel, v]) => ({
      channel,
      cost: round(v.cost), impressions: Math.round(v.impressions), clicks: Math.round(v.clicks),
      conversions: Math.round(v.conversions), revenue: round(v.revenue),
      roas: round(v.revenue / v.cost), cpa: round(v.cost / v.conversions),
    }))
    .sort((a, b) => b.cost - a.cost);

  const totals = channels.reduce((t, c) => ({
    cost: t.cost + c.cost, impressions: t.impressions + c.impressions, clicks: t.clicks + c.clicks,
    conversions: t.conversions + c.conversions, revenue: t.revenue + c.revenue,
  }), { cost: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 });
  totals.cost = round(totals.cost); totals.revenue = round(totals.revenue);
  totals.roas = round(totals.revenue / totals.cost); totals.cpa = round(totals.cost / totals.conversions);

  return { totals, channels, monthly };
}

const out = { generatedAt: new Date().toISOString().slice(0, 10), synthetic: true, windowDays: 90, monthsBack: 6, clients: {} };
for (const [id, p] of Object.entries(PROFILES)) out.clients[id] = buildClient(id, p);

writeFileSync("src/data/client-data.json", JSON.stringify(out, null, 2));
for (const [id, c] of Object.entries(out.clients)) {
  console.log(`  ${id.padEnd(24)} $${Math.round(c.totals.cost).toLocaleString().padStart(9)}/90d  ${c.channels.length}ch  roas ${c.totals.roas}`);
}
console.log("\n✓ wrote src/data/client-data.json (synthetic, safe to commit)");
