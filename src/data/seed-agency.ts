import type { AgencyClient, AgencyTeamMember } from "@/types/campaign";

/**
 * Agency seed (Phase 9C) — Brainlabs, a UK independent performance agency,
 * managing a roster of DTC client brands. Scoped to the Agency persona.
 */

export const AGENCY = {
  name: "Brainlabs",
  domain: "brainlabs.co.uk",
  plan: "Agency",
  tagline: "Independent performance agency",
};

const CLIENTS_KEY = "fuseiq-agency-clients";

/** Public favicon for a domain — real logos, public + reliable, no asset hotlinking. */
export function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

/**
 * Returning agency's confirmed roster — real Brainlabs clients drawn from their
 * public case studies / client list (esteelauder.com, vans.com, harrods.com…).
 * Public marketing info, presented as the agency's confirmed roster.
 */
export const BRAINLABS_CLIENTS: AgencyClient[] = [
  { id: "client-estee", name: "Estée Lauder", domain: "esteelauder.com", industry: "Beauty & cosmetics", status: "active", monthlyBudget: 180000, lead: "Priya Shah", campaigns: 12 },
  { id: "client-vans", name: "Vans", domain: "vans.com", industry: "Footwear & apparel", status: "active", monthlyBudget: 95000, lead: "Marcus Patel", campaigns: 7 },
  { id: "client-harrods", name: "Harrods", domain: "harrods.com", industry: "Luxury retail", status: "active", monthlyBudget: 120000, lead: "Cynthia Irani", campaigns: 9 },
  { id: "client-simplybusiness", name: "Simply Business", domain: "simplybusiness.co.uk", industry: "SME insurance", status: "active", monthlyBudget: 40000, lead: "Priya Shah", campaigns: 5 },
  { id: "client-expedia", name: "Expedia", domain: "expedia.com", industry: "Travel", status: "onboarding", monthlyBudget: 60000, lead: "Jordan Reyes", campaigns: 3 },
];

/**
 * Discovery pool for net-new onboarding — clients "found on brainlabs.co.uk"
 * (their published client list). The agency confirms which they manage; nothing
 * is added silently. Real product would enrich from legit sources + confirm;
 * here it's a mocked discovery from public info.
 */
export interface DiscoveredClient {
  name: string;
  domain: string;
  industry: string;
}

export const BRAINLABS_DISCOVERED: DiscoveredClient[] = [
  { name: "Estée Lauder", domain: "esteelauder.com", industry: "Beauty & cosmetics" },
  { name: "Capital One", domain: "capitalone.com", industry: "Financial services" },
  { name: "Vans", domain: "vans.com", industry: "Footwear & apparel" },
  { name: "Harrods", domain: "harrods.com", industry: "Luxury retail" },
  { name: "Expedia", domain: "expedia.com", industry: "Travel" },
  { name: "American Express", domain: "americanexpress.com", industry: "Financial services" },
  { name: "Formula 1", domain: "formula1.com", industry: "Sports & entertainment" },
  { name: "Simply Business", domain: "simplybusiness.co.uk", industry: "SME insurance" },
];

/** Turn a discovered client into a roster entry (onboarding, awaiting setup). */
export function discoveredToClient(d: DiscoveredClient): AgencyClient {
  return {
    id: `client-${d.domain.split(".")[0]}`,
    name: d.name,
    domain: d.domain,
    industry: d.industry,
    status: "onboarding",
    monthlyBudget: 0,
    lead: "Unassigned",
    campaigns: 0,
  };
}

export const BRAINLABS_TEAM: AgencyTeamMember[] = [
  { id: "tm-cynthia", name: "Cynthia Irani", initials: "CI", role: "strategist" },
  { id: "tm-priya", name: "Priya Shah", initials: "PS", role: "strategist" },
  { id: "tm-marcus", name: "Marcus Patel", initials: "MP", role: "account-lead" },
  { id: "tm-jordan", name: "Jordan Reyes", initials: "JR", role: "client" },
];

export const ROLE_LABELS: Record<AgencyTeamMember["role"], { label: string; can: string }> = {
  strategist: { label: "Strategist", can: "Builds campaigns, audiences & plans" },
  "account-lead": { label: "Account Lead", can: "Reviews & approves before launch" },
  client: { label: "Client", can: "Views reports & comments" },
};

export function loadAgencyClients(): AgencyClient[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CLIENTS_KEY);
    if (raw) return JSON.parse(raw) as AgencyClient[];
  } catch {}
  return [];
}

export function persistAgencyClients(clients: AgencyClient[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  } catch {}
}

/**
 * Seed the Brainlabs roster for a returning agency. Skips in first-time demo
 * mode (so the agency onboarding empty-state can be shown).
 */
export function ensureAgencySeed(): AgencyClient[] {
  if (typeof window === "undefined") return [];
  const existing = loadAgencyClients();
  if (existing.length > 0) return existing;
  if (localStorage.getItem("fuseiq-demo-user-state") === "first-time") return [];
  persistAgencyClients(BRAINLABS_CLIENTS);
  return BRAINLABS_CLIENTS;
}

/* ── Active client (agency "in-client" mode) ───────────────────────────────
   Entering a client scopes the whole app to that client. We clear the shared
   workspace keys on switch so the entered client reseeds fresh, then store the
   active client. getCurrentBrand() reads this to resolve the brand. A full
   reload re-hydrates everything against the new scope. */

const ACTIVE_CLIENT_KEY = "fuseiq-active-client";
const WORKSPACE_KEYS = [
  "fuseiq-strategies", "fuseiq-advertisers", "fuseiq-audiences",
  "fuseiq-narratives", "fuseiq-approvals", "fuseiq-briefs", "fuseiq-chat-sessions",
];

export interface ActiveClient {
  id: string;
  name: string;
  domain: string;
  industry: string;
}

export function getActiveClient(): ActiveClient | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_CLIENT_KEY);
    return raw ? (JSON.parse(raw) as ActiveClient) : null;
  } catch {
    return null;
  }
}

/** Enter a client's scoped workspace (clears the prior scope; caller reloads). */
export function enterClient(c: AgencyClient): void {
  WORKSPACE_KEYS.forEach((k) => localStorage.removeItem(k));
  localStorage.setItem(ACTIVE_CLIENT_KEY, JSON.stringify({ id: c.id, name: c.name, domain: c.domain, industry: c.industry }));
}

/** Return to the agency portfolio (clears client scope; caller reloads). */
export function exitClient(): void {
  WORKSPACE_KEYS.forEach((k) => localStorage.removeItem(k));
  localStorage.removeItem(ACTIVE_CLIENT_KEY);
}

/** AI-native client onboarding: infer a client brand from a pasted domain. */
export function inferClientFromDomain(input: string): AgencyClient {
  const domain = input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
  const root = domain.split(".")[0] || "client";
  const name = root
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    id: `client-${Date.now()}`,
    name: name || "New Client",
    domain: domain || "example.com",
    industry: "Inferred from site",
    status: "onboarding",
    monthlyBudget: 0,
    lead: "Unassigned",
    campaigns: 0,
  };
}
