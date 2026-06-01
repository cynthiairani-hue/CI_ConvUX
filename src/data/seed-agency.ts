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

export const BRAINLABS_CLIENTS: AgencyClient[] = [
  { id: "client-ffern", name: "Ffern", domain: "ffern.co", industry: "Luxury fragrance", status: "active", monthlyBudget: 8000, lead: "Cynthia Irani", campaigns: 3 },
  { id: "client-bloomwild", name: "Bloom & Wild", domain: "bloomandwild.com", industry: "DTC flowers & gifting", status: "active", monthlyBudget: 14000, lead: "Priya Shah", campaigns: 5 },
  { id: "client-gymshark", name: "Gymshark", domain: "gymshark.com", industry: "Activewear apparel", status: "active", monthlyBudget: 40000, lead: "Marcus Patel", campaigns: 8 },
  { id: "client-huel", name: "Huel", domain: "huel.com", industry: "DTC food & nutrition", status: "onboarding", monthlyBudget: 22000, lead: "Jordan Reyes", campaigns: 2 },
];

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
