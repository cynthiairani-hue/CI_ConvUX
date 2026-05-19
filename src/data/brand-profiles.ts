/**
 * Brand profiles inferred from signup email domain.
 *
 * In production this would be a Clearbit/website-scrape pipeline.
 * For the prototype we hardcode Ffern as the demo brand and fall back
 * to a generic profile for unknown domains.
 */

export interface BrandProfile {
  domain: string;
  name: string;
  industry: string;
  tagline: string;
  /** Hero carousel images — auto-crossfade on the hero card */
  heroImages: string[];
  /** One image per secondary card (index 0 = "see performance", 1 = "connect accounts", 2 = "plan spend") */
  cardImages: string[];
}

const FFERN_CDN = "https://cdn.sanity.io/images/1ciyq081/production";

export const brandProfiles: Record<string, BrandProfile> = {
  "ffern.co": {
    domain: "ffern.co",
    name: "Ffern",
    industry: "Luxury Fragrance",
    tagline: "Natural, limited-edition, blended in the English countryside.",
    heroImages: [
      `${FFERN_CDN}/b68d130daa310938d403a88a9f33d6441e7cdf41-2000x2500.jpg?w=600&h=400&fit=crop&crop=focalpoint&auto=format`,
      `${FFERN_CDN}/bcbe2b7b9b73336b9e681b018c9ab4cb1852d2e3-3656x3656.jpg?w=600&h=400&fit=crop&crop=focalpoint&auto=format`,
      `${FFERN_CDN}/b5249f0b979a6e71074d2f6c06cdf76773177fdb-1297x1080.jpg?w=600&h=400&fit=crop&crop=focalpoint&auto=format`,
      `${FFERN_CDN}/cbfbdc6e024ac304b1212c65bbb19d12a3d09711-1896x1896.jpg?w=600&h=400&fit=crop&crop=focalpoint&auto=format`,
    ],
    cardImages: [
      `${FFERN_CDN}/b68d130daa310938d403a88a9f33d6441e7cdf41-2000x2500.jpg?w=200&h=200&fit=crop&crop=focalpoint&auto=format`,
      `${FFERN_CDN}/bcbe2b7b9b73336b9e681b018c9ab4cb1852d2e3-3656x3656.jpg?w=200&h=200&fit=crop&crop=focalpoint&auto=format`,
      `${FFERN_CDN}/b5249f0b979a6e71074d2f6c06cdf76773177fdb-1297x1080.jpg?w=200&h=200&fit=crop&crop=focalpoint&auto=format`,
    ],
  },
};

/**
 * Look up a brand profile from a signup email address.
 * Returns null for unknown domains (fall back to generic UI).
 */
export function getBrandFromEmail(email: string): BrandProfile | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  return brandProfiles[domain] ?? null;
}

/**
 * Get the current user's brand profile from localStorage.
 * Returns null if no user stored or domain not recognized.
 */
export function getCurrentBrand(): BrandProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("fuseiq-user");
    if (stored) {
      const { email } = JSON.parse(stored);
      return email ? getBrandFromEmail(email) : null;
    }
  } catch {
    // ignore
  }
  return null;
}
