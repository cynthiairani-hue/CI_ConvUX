import type { ReadinessState } from "@/types/campaign";
import { integrations } from "./integrations";

/**
 * Prerequisite engine — readiness is a function of the campaign objective.
 *
 * Principle: platform-provided capability (the DSP / buying layer, simulated
 * performance data) is assumed connected. We model as real, can-be-missing
 * prerequisites only the USER-OWNED first-party signal and assets:
 *   - site pixel  → retargeting + conversion optimization
 *   - product feed → shopping / catalog campaigns
 *   - CRM         → customer-list / lookalike seeding
 *   - creative    → every campaign (pulled from the brand site when available)
 *
 * This is what makes the lifecycle visible without gating everything: awareness
 * activates from a cold start; signal-dependent objectives gate on what they
 * actually require.
 */

export interface Capabilities {
  /** First-party site tag for retargeting / conversion tracking. */
  hasSitePixel: boolean;
  /** Product catalog feed (Shopify / Woo / BigCommerce). */
  hasProductFeed: boolean;
  /** CRM connection for customer-list and lookalike seeds. */
  hasCRM: boolean;
  /** Production-grade creative assets pullable from the brand site. */
  hasCreativeAssets: boolean;
}

export interface SectionPrerequisite {
  /** Capability key the section is waiting on (e.g. "site-pixel"). */
  requires: string;
  /** CTA label for the inline connect action. */
  connectLabel: string;
}

export interface SectionReadiness {
  readiness: ReadinessState;
  prerequisite?: SectionPrerequisite;
  /** Human-readable provenance reasoning for the section. */
  reason: string;
}

/**
 * Derive capabilities from the live connection state + brand asset availability.
 *
 * Note on the pixel: an ad-platform connection (Meta, Google) is NOT the same as
 * the first-party site tag installed on the advertiser's domain — the tag is a
 * distinct install. We model it as a separate, explicitly-installed capability so
 * the retargeting/conversion gate is meaningful. Demo seed: not yet installed.
 */
export function getCapabilities(opts?: {
  hasCreativeAssets?: boolean;
  hasSitePixel?: boolean;
}): Capabilities {
  const connected = new Set(
    integrations.filter((i) => i.status === "connected").map((i) => i.id)
  );
  return {
    hasSitePixel: opts?.hasSitePixel ?? false,
    hasProductFeed:
      connected.has("shopify") ||
      connected.has("woocommerce") ||
      connected.has("bigcommerce"),
    hasCRM:
      connected.has("hubspot") ||
      connected.has("salesforce") ||
      connected.has("klaviyo"),
    hasCreativeAssets: opts?.hasCreativeAssets ?? true,
  };
}

/** Objectives whose optimization depends on first-party site signal. */
const PIXEL_DEPENDENT = new Set(["retargeting", "leads", "sales"]);

export function evaluateAudienceReadiness(
  objective: string,
  caps: Capabilities,
  siteDomain: string
): SectionReadiness {
  if (PIXEL_DEPENDENT.has(objective) && !caps.hasSitePixel) {
    return {
      readiness: "blocked",
      prerequisite: { requires: "site-pixel", connectLabel: "Connect your site pixel" },
      reason: `A ${objective} campaign optimizes against on-site behavior, which requires the site pixel firing on ${siteDomain}. Awareness and traffic objectives don't need it — this prerequisite is specific to signal-dependent objectives.`,
    };
  }
  return {
    readiness: "ready",
    reason:
      "Audience quality is the single biggest lever for campaign performance. Higher-intent segments convert at 3-5x the rate of broad targeting.",
  };
}

export function evaluateCreativeReadiness(
  caps: Capabilities,
  siteDomain: string
): SectionReadiness {
  if (caps.hasCreativeAssets) {
    return {
      readiness: "ready",
      reason: `Pulled brand video and imagery from ${siteDomain}. For an awareness campaign, creative is the only hard prerequisite — and you already have production-grade assets, so you're ready to launch.`,
    };
  }
  return {
    readiness: "limited",
    reason:
      "Multiple creative variations enable A/B testing. I'll rotate top performers and pause underperformers automatically.",
  };
}
