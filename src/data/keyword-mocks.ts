import type { IABIndustry, KeywordChip } from "@/types/campaign";
import type { BrandKeywords } from "@/data/brand-profiles";

const KEYWORD_POOLS: Record<IABIndustry, { brand: string[]; product: string[]; competitor: string[]; interest: string[] }> = {
  automotive: {
    brand: ["auto dealer", "car dealership"],
    product: ["SUV deals", "electric vehicles", "truck inventory", "certified pre-owned", "auto financing"],
    competitor: ["CarMax", "AutoNation", "Carvana"],
    interest: ["car reviews", "road trips", "fuel economy", "car maintenance", "auto insurance"],
  },
  "business-finance": {
    brand: ["financial services", "consulting firm"],
    product: ["business loans", "payroll software", "accounting solutions", "invoice management"],
    competitor: ["QuickBooks", "Stripe", "Square"],
    interest: ["small business tips", "startup funding", "tax planning", "cash flow management", "fintech"],
  },
  careers: {
    brand: ["job board", "recruiting platform"],
    product: ["resume builder", "career coaching", "job alerts", "interview prep"],
    competitor: ["LinkedIn", "Indeed", "Glassdoor"],
    interest: ["career development", "remote work", "salary negotiation", "professional growth"],
  },
  education: {
    brand: ["online learning", "education platform"],
    product: ["online courses", "certification programs", "tutoring services", "test prep"],
    competitor: ["Coursera", "Udemy", "Khan Academy"],
    interest: ["lifelong learning", "STEM education", "professional development", "student resources"],
  },
  entertainment: {
    brand: ["streaming service", "entertainment brand"],
    product: ["live events", "ticket sales", "on-demand content", "gaming subscriptions"],
    competitor: ["Netflix", "Spotify", "Disney+"],
    interest: ["movie reviews", "concert tickets", "gaming news", "pop culture", "celebrity news"],
  },
  "family-relationships": {
    brand: ["family services", "parenting platform"],
    product: ["family planning", "childcare services", "parenting courses", "baby products"],
    competitor: ["BabyCenter", "The Bump", "What to Expect"],
    interest: ["parenting tips", "child development", "family activities", "school readiness"],
  },
  "food-drink": {
    brand: ["restaurant chain", "food brand"],
    product: ["meal kits", "food delivery", "specialty ingredients", "kitchen appliances", "recipes"],
    competitor: ["DoorDash", "HelloFresh", "Blue Apron"],
    interest: ["healthy eating", "cooking tips", "restaurant reviews", "food trends", "dietary plans"],
  },
  "healthy-living": {
    brand: ["wellness brand", "health platform"],
    product: ["supplements", "fitness programs", "meditation apps", "health trackers"],
    competitor: ["Peloton", "Calm", "MyFitnessPal"],
    interest: ["mental health", "yoga", "nutrition", "weight management", "sleep hygiene"],
  },
  "hobbies-interests": {
    brand: ["hobby supplies", "craft brand"],
    product: ["craft supplies", "hobby kits", "collectibles", "outdoor gear"],
    competitor: ["Michaels", "Etsy", "REI"],
    interest: ["DIY projects", "photography", "gardening", "model building", "board games"],
  },
  "home-garden": {
    brand: ["home improvement", "garden center"],
    product: ["furniture", "smart home devices", "landscaping services", "renovation supplies"],
    competitor: ["Wayfair", "Home Depot", "IKEA"],
    interest: ["interior design", "home renovation", "sustainable living", "smart home", "outdoor living"],
  },
  "law-government": {
    brand: ["legal services", "gov tech"],
    product: ["legal consultation", "document filing", "compliance software", "civic engagement"],
    competitor: ["LegalZoom", "Rocket Lawyer", "Avvo"],
    interest: ["legal rights", "regulations", "public policy", "civic participation"],
  },
  "personal-finance": {
    brand: ["financial advisor", "fintech app"],
    product: ["investment accounts", "savings tools", "credit monitoring", "budgeting apps", "tax filing"],
    competitor: ["Robinhood", "Mint", "Wealthfront"],
    interest: ["investing tips", "retirement planning", "debt management", "credit score", "crypto"],
  },
  pets: {
    brand: ["pet supplies", "pet care"],
    product: ["pet food", "veterinary services", "pet insurance", "grooming products", "pet toys"],
    competitor: ["Chewy", "PetSmart", "BarkBox"],
    interest: ["dog training", "cat care", "pet adoption", "pet health", "exotic pets"],
  },
  science: {
    brand: ["research lab", "science publisher"],
    product: ["lab equipment", "research tools", "science kits", "publications"],
    competitor: ["Nature", "Science Magazine", "arXiv"],
    interest: ["space exploration", "climate science", "biotechnology", "AI research", "physics"],
  },
  sports: {
    brand: ["sports brand", "athletic gear"],
    product: ["athletic wear", "sports equipment", "fitness subscriptions", "team merchandise"],
    competitor: ["Nike", "Adidas", "Under Armour"],
    interest: ["NFL", "NBA", "soccer", "marathon training", "fantasy sports", "extreme sports"],
  },
  "style-fashion": {
    brand: ["fashion retailer", "luxury brand"],
    product: ["apparel", "accessories", "footwear", "sustainable fashion", "designer collections"],
    competitor: ["Zara", "H&M", "ASOS", "Nordstrom"],
    interest: ["fashion trends", "street style", "seasonal lookbooks", "sustainable fashion", "beauty"],
  },
  "technology-computing": {
    brand: ["SaaS platform", "tech company"],
    product: ["cloud services", "developer tools", "cybersecurity", "AI solutions", "hardware"],
    competitor: ["AWS", "Google Cloud", "Salesforce"],
    interest: ["AI & ML", "startup news", "product launches", "software reviews", "tech conferences"],
  },
  travel: {
    brand: ["travel agency", "hospitality brand"],
    product: ["flight deals", "hotel bookings", "vacation packages", "travel insurance", "car rentals"],
    competitor: ["Booking.com", "Airbnb", "Expedia"],
    interest: ["travel guides", "adventure travel", "luxury resorts", "budget travel", "digital nomad"],
  },
  "news-current-events": {
    brand: ["news outlet", "media company"],
    product: ["news subscriptions", "newsletters", "podcast network", "live coverage"],
    competitor: ["NYT", "CNN", "Reuters"],
    interest: ["breaking news", "investigative journalism", "opinion pieces", "world events"],
  },
  other: {
    brand: ["brand awareness", "company name"],
    product: ["core product", "premium tier", "free trial", "enterprise plan"],
    competitor: ["market leader", "emerging competitor", "industry disruptor"],
    interest: ["industry trends", "market research", "thought leadership", "innovation"],
  },
};

function extractBrandName(websiteUrl: string): string {
  try {
    const url = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`);
    const hostname = url.hostname.replace(/^www\./, "");
    const parts = hostname.split(".");
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  } catch {
    return "Brand";
  }
}

export function generateKeywordsForIndustry(
  industry: IABIndustry,
  websiteUrl: string,
  /** Brand-specific keywords override — used instead of generic industry pool when available */
  brandKeywords?: BrandKeywords,
): KeywordChip[] {
  const pool = brandKeywords || KEYWORD_POOLS[industry] || KEYWORD_POOLS.other;
  const brandName = extractBrandName(websiteUrl);

  const keywords: KeywordChip[] = [];
  let id = 0;

  // Lead with the brand name itself
  keywords.push({
    id: `kw-${id++}`,
    label: brandName,
    category: "brand",
    selected: true,
  });

  for (const label of pool.brand) {
    keywords.push({ id: `kw-${id++}`, label, category: "brand", selected: true });
  }

  for (const label of pool.product) {
    keywords.push({ id: `kw-${id++}`, label, category: "product", selected: true });
  }

  for (const label of pool.competitor) {
    keywords.push({ id: `kw-${id++}`, label, category: "competitor", selected: false });
  }

  for (const label of pool.interest) {
    keywords.push({ id: `kw-${id++}`, label, category: "interest", selected: true });
  }

  return keywords;
}
