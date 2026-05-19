import type { StrategyPlan, Advertiser, CFONarrative } from "@/types/campaign";

const STRATEGIES_KEY = "fuseiq-strategies";
const ADVERTISERS_KEY = "fuseiq-advertisers";
const NARRATIVES_KEY = "fuseiq-narratives";

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

export function loadStrategies(): StrategyPlan[] {
  return safeGet<StrategyPlan[]>(STRATEGIES_KEY, []);
}

export function persistStrategies(strategies: StrategyPlan[]): void {
  safeSet(STRATEGIES_KEY, strategies);
}

export function loadAdvertisers(): Advertiser[] {
  return safeGet<Advertiser[]>(ADVERTISERS_KEY, []);
}

export function persistAdvertisers(advertisers: Advertiser[]): void {
  safeSet(ADVERTISERS_KEY, advertisers);
}

export function loadNarratives(): CFONarrative[] {
  return safeGet<CFONarrative[]>(NARRATIVES_KEY, []);
}

export function persistNarratives(narratives: CFONarrative[]): void {
  safeSet(NARRATIVES_KEY, narratives);
}
