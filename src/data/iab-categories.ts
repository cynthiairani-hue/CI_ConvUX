import type { IABRestrictedCategory, IABIndustry, PlacementType } from "@/types/campaign";

export const IAB_RESTRICTED_CATEGORIES: { id: IABRestrictedCategory; label: string }[] = [
  { id: "drugs-tobacco-alcohol", label: "Alcohol, Tobacco, Drugs & E-Cigarettes" },
  { id: "adult-content", label: "Adult & Explicit Sexual Content" },
  { id: "arms-ammunition", label: "Arms & Ammunition" },
  { id: "terrorism", label: "Terrorism" },
  { id: "crime-harmful", label: "Crime & Harmful Acts" },
  { id: "death-injury-military", label: "Death, Injury & Military Conflict" },
  { id: "hate-speech", label: "Hate Speech & Acts of Aggression" },
  { id: "obscenity-profanity", label: "Obscenity & Profanity" },
  { id: "sensitive-social", label: "Sensitive Social Issues" },
  { id: "online-piracy", label: "Online Piracy" },
  { id: "spam-harmful", label: "Spam & Harmful Content" },
];

export const IAB_INDUSTRIES: { id: IABIndustry; label: string }[] = [
  { id: "automotive", label: "Automotive" },
  { id: "business-finance", label: "Business & Finance" },
  { id: "careers", label: "Careers" },
  { id: "education", label: "Education" },
  { id: "entertainment", label: "Entertainment" },
  { id: "family-relationships", label: "Family & Relationships" },
  { id: "food-drink", label: "Food & Drink" },
  { id: "healthy-living", label: "Healthy Living" },
  { id: "hobbies-interests", label: "Hobbies & Interests" },
  { id: "home-garden", label: "Home & Garden" },
  { id: "law-government", label: "Law & Government" },
  { id: "personal-finance", label: "Personal Finance" },
  { id: "pets", label: "Pets" },
  { id: "science", label: "Science" },
  { id: "sports", label: "Sports" },
  { id: "style-fashion", label: "Style & Fashion" },
  { id: "technology-computing", label: "Technology & Computing" },
  { id: "travel", label: "Travel" },
  { id: "news-current-events", label: "News & Current Events" },
  { id: "other", label: "Other" },
];

export const PLACEMENT_TYPES: { id: PlacementType; label: string; description: string }[] = [
  { id: "display", label: "Display", description: "Banner ads across desktop & mobile web" },
  { id: "video", label: "Video", description: "Pre-roll, mid-roll & out-stream video" },
  { id: "ctv-ott", label: "CTV / OTT", description: "Connected TV & streaming platforms" },
  { id: "native", label: "Native", description: "In-feed & branded content placements" },
  { id: "audio", label: "Audio", description: "Podcast & streaming radio ads" },
  { id: "dooh", label: "DOOH", description: "Digital out-of-home screens & billboards" },
  { id: "in-app", label: "In-App", description: "Mobile app inventory" },
  { id: "rich-media", label: "Rich Media", description: "Interactive & expandable formats" },
];
