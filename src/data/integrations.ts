export type IntegrationCategory =
  | "all"
  | "ad-platforms"
  | "analytics"
  | "crm"
  | "ecommerce"
  | "attribution"
  | "creative"
  | "data-warehouse";

export type IntegrationStatus = "available" | "connected" | "coming-soon";

export interface Integration {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  status: IntegrationStatus;
  /** Hex color for the logo background */
  logoBg: string;
  /** Brand color for the logo text */
  logoColor: string;
  /** Short text rendered as the logo (e.g. "G", "Meta") */
  logoEmoji: string;
  /** Whether this integration is built by FuseIQ */
  builtIn: boolean;
  /** What data this connector syncs */
  dataPoints?: string[];
  /** Simulated last sync time (ISO) — set when toggled on */
  lastSyncedAt?: string;
}

export const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  all: "All",
  "ad-platforms": "Ad Platforms",
  analytics: "Analytics",
  crm: "CRM",
  ecommerce: "E-commerce",
  attribution: "Attribution",
  creative: "Creative",
  "data-warehouse": "Data Warehouse",
};

export const integrations: Integration[] = [
  // Ad Platforms
  {
    id: "google-ads",
    name: "Google Ads",
    category: "ad-platforms",
    description: "Import campaigns, sync audiences, and track conversions across Search, Display, YouTube, and Performance Max.",
    status: "connected",
    logoBg: "#E8F0FE",
    logoColor: "#4285F4",
    logoEmoji: "G",
    builtIn: true,
    dataPoints: ["Campaigns", "Ad groups", "Conversions", "Audiences"],
  },
  {
    id: "meta-ads",
    name: "Meta Ads",
    category: "ad-platforms",
    description: "Manage Facebook and Instagram campaigns. Sync custom audiences, track pixel events, and optimize creative.",
    status: "connected",
    logoBg: "#E7F0FF",
    logoColor: "#1877F2",
    logoEmoji: "Meta",
    builtIn: true,
    dataPoints: ["Campaigns", "Custom audiences", "Pixel events", "Creative"],
  },
  {
    id: "tiktok-ads",
    name: "TikTok Ads",
    category: "ad-platforms",
    description: "Run and optimize TikTok campaigns. Sync audience segments and track in-app conversions.",
    status: "available",
    logoBg: "#F0F0F0",
    logoColor: "#000000",
    logoEmoji: "TT",
    builtIn: true,
    dataPoints: ["Campaigns", "Audiences", "In-app events"],
  },
  {
    id: "linkedin-ads",
    name: "LinkedIn Ads",
    category: "ad-platforms",
    description: "Target by job title, company, and seniority. Sync matched audiences and track lead gen form submissions.",
    status: "available",
    logoBg: "#E8F4FD",
    logoColor: "#0A66C2",
    logoEmoji: "in",
    builtIn: true,
    dataPoints: ["Campaigns", "Matched audiences", "Lead gen forms"],
  },
  {
    id: "the-trade-desk",
    name: "The Trade Desk",
    category: "ad-platforms",
    description: "Programmatic display, video, CTV, and audio. Sync audiences and optimize bids across premium inventory.",
    status: "available",
    logoBg: "#E8F8E8",
    logoColor: "#00B140",
    logoEmoji: "TTD",
    builtIn: true,
    dataPoints: ["Campaigns", "Audiences", "CTV inventory", "Bid data"],
  },
  {
    id: "dv360",
    name: "Display & Video 360",
    category: "ad-platforms",
    description: "Google's DSP for programmatic buying. Manage display, video, and CTV campaigns with advanced audience controls.",
    status: "available",
    logoBg: "#E8F0FE",
    logoColor: "#4285F4",
    logoEmoji: "DV",
    builtIn: true,
    dataPoints: ["Campaigns", "Insertion orders", "Line items", "Audiences"],
  },
  {
    id: "pinterest-ads",
    name: "Pinterest Ads",
    category: "ad-platforms",
    description: "Promote pins, build shopping campaigns, and track conversions with the Pinterest tag.",
    status: "coming-soon",
    logoBg: "#FDE8E8",
    logoColor: "#E60023",
    logoEmoji: "P",
    builtIn: false,
  },
  {
    id: "x-ads",
    name: "X Ads",
    category: "ad-platforms",
    description: "Run promoted posts and video ads. Target by interest, keyword, and follower lookalikes.",
    status: "coming-soon",
    logoBg: "#F0F0F0",
    logoColor: "#000000",
    logoEmoji: "X",
    builtIn: false,
  },

  // Analytics
  {
    id: "google-analytics",
    name: "Google Analytics 4",
    category: "analytics",
    description: "Import GA4 events, audiences, and conversion data. Correlate ad spend with on-site behavior.",
    status: "connected",
    logoBg: "#FFF3E0",
    logoColor: "#E37400",
    logoEmoji: "GA",
    builtIn: true,
    dataPoints: ["Events", "Audiences", "Conversions", "User properties"],
  },
  {
    id: "amplitude",
    name: "Amplitude",
    category: "analytics",
    description: "Sync product analytics events and cohorts. Use behavioral data to build high-intent audiences.",
    status: "available",
    logoBg: "#E8E4F8",
    logoColor: "#6C47FF",
    logoEmoji: "A",
    builtIn: false,
    dataPoints: ["Events", "Cohorts", "User properties"],
  },
  {
    id: "mixpanel",
    name: "Mixpanel",
    category: "analytics",
    description: "Import event data and user cohorts. Power campaign targeting with product engagement signals.",
    status: "available",
    logoBg: "#E8E4F8",
    logoColor: "#7856FF",
    logoEmoji: "M",
    builtIn: false,
    dataPoints: ["Events", "Cohorts", "Funnels"],
  },

  // CRM
  {
    id: "hubspot",
    name: "HubSpot",
    category: "crm",
    description: "Sync contacts, deals, and lifecycle stages. Trigger campaigns based on CRM pipeline changes.",
    status: "available",
    logoBg: "#FFE8D6",
    logoColor: "#FF7A59",
    logoEmoji: "H",
    builtIn: true,
    dataPoints: ["Contacts", "Deals", "Lifecycle stages", "Lists"],
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "crm",
    description: "Import leads, opportunities, and account data. Match CRM segments to ad audiences automatically.",
    status: "available",
    logoBg: "#E0F0FF",
    logoColor: "#00A1E0",
    logoEmoji: "SF",
    builtIn: true,
    dataPoints: ["Leads", "Opportunities", "Accounts", "Campaigns"],
  },
  {
    id: "klaviyo",
    name: "Klaviyo",
    category: "crm",
    description: "Sync email lists, segments, and customer profiles. Coordinate email and paid campaigns.",
    status: "available",
    logoBg: "#E8F8E8",
    logoColor: "#2D2D2D",
    logoEmoji: "K",
    builtIn: false,
    dataPoints: ["Lists", "Segments", "Profiles", "Flows"],
  },

  // E-commerce
  {
    id: "shopify",
    name: "Shopify",
    category: "ecommerce",
    description: "Import product catalog, track orders, and sync customer segments. Automate retargeting for abandoned carts.",
    status: "connected",
    logoBg: "#E4F8E0",
    logoColor: "#96BF48",
    logoEmoji: "S",
    builtIn: true,
    dataPoints: ["Products", "Orders", "Customers", "Abandoned carts"],
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    category: "ecommerce",
    description: "Connect your WordPress store. Import products, track purchases, and build audiences from order history.",
    status: "available",
    logoBg: "#E8E0F8",
    logoColor: "#96588A",
    logoEmoji: "W",
    builtIn: false,
    dataPoints: ["Products", "Orders", "Customers"],
  },
  {
    id: "bigcommerce",
    name: "BigCommerce",
    category: "ecommerce",
    description: "Sync catalog, orders, and customer data. Target high-value shoppers with behavioral segments.",
    status: "coming-soon",
    logoBg: "#F0F0F0",
    logoColor: "#34313F",
    logoEmoji: "B",
    builtIn: false,
  },

  // Attribution
  {
    id: "appsflyer",
    name: "AppsFlyer",
    category: "attribution",
    description: "Mobile attribution and deep linking. Measure installs, in-app events, and cross-platform ROI.",
    status: "available",
    logoBg: "#E0F4FF",
    logoColor: "#30B3D7",
    logoEmoji: "AF",
    builtIn: true,
    dataPoints: ["Installs", "In-app events", "Deep links", "ROI"],
  },
  {
    id: "adjust",
    name: "Adjust",
    category: "attribution",
    description: "Precise mobile attribution and measurement. Track installs, events, and ROAS across campaigns.",
    status: "available",
    logoBg: "#F0F0F0",
    logoColor: "#2F3740",
    logoEmoji: "Ad",
    builtIn: true,
    dataPoints: ["Installs", "Events", "ROAS", "Fraud prevention"],
  },

  // Creative
  {
    id: "figma",
    name: "Figma",
    category: "creative",
    description: "Pull ad creative assets directly from Figma. Preview designs and export production-ready formats.",
    status: "coming-soon",
    logoBg: "#F3E8FF",
    logoColor: "#A259FF",
    logoEmoji: "Fi",
    builtIn: false,
  },
  {
    id: "canva",
    name: "Canva",
    category: "creative",
    description: "Import and edit ad creative from your Canva workspace. Resize and adapt across platforms.",
    status: "coming-soon",
    logoBg: "#E0F4FF",
    logoColor: "#00C4CC",
    logoEmoji: "C",
    builtIn: false,
  },

  // Data Warehouse
  {
    id: "snowflake",
    name: "Snowflake",
    category: "data-warehouse",
    description: "Query first-party data directly. Build audiences from warehouse tables and sync back campaign results.",
    status: "available",
    logoBg: "#E0F4FF",
    logoColor: "#29B5E8",
    logoEmoji: "S",
    builtIn: false,
    dataPoints: ["Tables", "Views", "Queries", "Results sync"],
  },
  {
    id: "bigquery",
    name: "BigQuery",
    category: "data-warehouse",
    description: "Connect Google BigQuery for advanced audience modeling and cross-channel attribution analysis.",
    status: "available",
    logoBg: "#E8F0FE",
    logoColor: "#4285F4",
    logoEmoji: "BQ",
    builtIn: false,
    dataPoints: ["Datasets", "Tables", "ML models", "Results sync"],
  },
];
