import type { ServiceCategory } from "@/lib/types";

export const CACHE_TTL_MS = 5 * 60 * 1000;
export const PAGE_FETCH_TIMEOUT_MS = 3500;
export const GEMINI_EXTRACTION_TIMEOUT_MS = 4000;
export const MAX_SEARCH_RESULTS_PER_CATEGORY = 4;
export const MAX_TRUSTED_PAGES_PER_CATEGORY = 2;
export const MAX_CANDIDATES_PER_PAGE = 4;

export const socialAndNewsHosts = [
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "tiktok.com",
  "youtube.com",
  "linkedin.com",
  "reddit.com",
  "blogspot.com",
  "medium.com",
  "substack.com",
  "yelp.com",
  "tripadvisor.com",
  "cbc.ca",
  "globalnews.ca",
  "ctvnews.ca"
];

export const lowTrustPathHints = ["/news/", "/article/", "/blog/", "/press-release/"];

export const discoveryQueryTemplates: Record<
  Extract<ServiceCategory, "food" | "free-food-events" | "showers" | "shelters" | "services" | "clinics">,
  string[]
> = {
  food: ["food bank", "community meal", "soup kitchen"],
  "free-food-events": ["free lunch", "community meal", "meal program"],
  showers: ["shower program", "hygiene service"],
  shelters: ["emergency shelter", "homeless shelter"],
  services: ["drop-in support", "housing support", "community support centre"],
  clinics: ["community health centre", "clinic for uninsured", "primary care"]
};
