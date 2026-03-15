import { z } from "zod";
import { braveSearchApiKey, hasBraveSearchEnv, hasGeminiEnv, serverEnv } from "@/lib/env";
import { searchBraveWeb, type SearchResult } from "@/lib/adapters/brave-search";
import {
  geocodeLocation,
  getPlaceDetails,
  searchPlaceMetadataByText
} from "@/lib/adapters/google-maps";
import { logError } from "@/lib/logger";
import { ServiceSchema, type LocationContext, type Service, type ServiceCategory } from "@/lib/types";
import { haversineDistanceMeters, safeJsonParse, slugify } from "@/lib/utils";

const WebDiscoveryCandidateSchema = z.object({
  name: z.string(),
  category: z.enum(["food", "free-food-events", "showers", "shelters", "services", "clinics"]),
  address: z.string().optional(),
  description: z.string().optional(),
  hoursText: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  eligibilityNotes: z.string().optional()
});

type WebDiscoveryCandidate = z.infer<typeof WebDiscoveryCandidateSchema>;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

type DiscoveryResult = {
  services: Service[];
  warnings: string[];
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const PAGE_FETCH_TIMEOUT_MS = 3500;
const GEMINI_EXTRACTION_TIMEOUT_MS = 4000;
const MAX_SEARCH_RESULTS_PER_CATEGORY = 4;
const MAX_TRUSTED_PAGES_PER_CATEGORY = 2;
const MAX_CANDIDATES_PER_PAGE = 4;
const pageCache = new Map<string, CacheEntry<string>>();
const discoveryCache = new Map<string, CacheEntry<DiscoveryResult>>();

const socialAndNewsHosts = [
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

const lowTrustPathHints = ["/news/", "/article/", "/blog/", "/press-release/"];

const discoveryQueryTemplates: Record<
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

function getCachedValue<T>(cache: Map<string, CacheEntry<T>>, key: string) {
  const record = cache.get(key);
  if (!record) {
    return null;
  }
  if (Date.now() > record.expiresAt) {
    cache.delete(key);
    return null;
  }
  return record.value;
}

function setCachedValue<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
  return value;
}

function sourceNameFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Trusted web source";
  }
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export function stripHtmlToText(html: string) {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
  );
}

export function isTrustedDiscoveryUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }
    if (socialAndNewsHosts.some((blockedHost) => host === blockedHost || host.endsWith(`.${blockedHost}`))) {
      return false;
    }
    if (lowTrustPathHints.some((hint) => path.includes(hint))) {
      return false;
    }
    return (
      host.endsWith(".gov") ||
      host.endsWith(".gc.ca") ||
      host.endsWith(".org") ||
      host.endsWith(".edu") ||
      host.includes("library") ||
      host.includes("hospital") ||
      host.includes("health") ||
      host.includes("city") ||
      host.includes("county") ||
      host.includes("shelter")
    );
  } catch {
    return false;
  }
}

async function fetchPageText(url: string) {
  const cached = getCachedValue(pageCache, url);
  if (cached) {
    return cached;
  }

  const response = await fetchWithTimeout(url, { cache: "no-store" }, PAGE_FETCH_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(`Unable to fetch trusted page: ${response.status}`);
  }

  const html = await response.text();
  return setCachedValue(pageCache, url, stripHtmlToText(html).slice(0, 16000));
}

function buildDiscoveryQuery(category: WebDiscoveryCandidate["category"], location: LocationContext) {
  const terms = discoveryQueryTemplates[category];
  const cityContext = [location.label, location.city, location.region].filter(Boolean).join(", ");
  return `${terms.join(" OR ")} near ${cityContext}`;
}

async function extractCandidatesFromPage(input: {
  category: WebDiscoveryCandidate["category"];
  location: LocationContext;
  searchResult: SearchResult;
  pageText: string;
}) {
  if (!hasGeminiEnv) {
    return [] satisfies WebDiscoveryCandidate[];
  }

  const prompt = [
    "Extract only real location-based social services from the provided page.",
    "Return strict JSON as an array.",
    "Only include items clearly relevant to the requested category and city context.",
    "Do not invent addresses, hours, or phone numbers.",
    `Category: ${input.category}`,
    `Location context: ${input.location.label}`,
    `Source URL: ${input.searchResult.link}`,
    `Source title: ${input.searchResult.title}`,
    `Page text: ${input.pageText}`
  ].join("\n");

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${serverEnv.GEMINI_MODEL}:generateContent?key=${serverEnv.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      }),
      cache: "no-store"
    },
    GEMINI_EXTRACTION_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new Error(`Gemini discovery extraction failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return [] satisfies WebDiscoveryCandidate[];
  }

  const parsed = safeJsonParse<unknown>(text);
  const validated = z.array(WebDiscoveryCandidateSchema).safeParse(parsed);
  return validated.success
    ? validated.data.filter((candidate) => candidate.category === input.category)
    : [];
}

export async function validateDiscoveredCandidate(input: {
  candidate: WebDiscoveryCandidate;
  location: LocationContext;
  radiusMeters: number;
  sourceUrl: string;
}) {
  let resolvedPlace = null;
  let resolvedLocation = null;

  if (input.candidate.address) {
    try {
      resolvedLocation = await geocodeLocation({
        location: input.candidate.address,
        label: input.candidate.name
      });
      if (resolvedLocation.placeId) {
        resolvedPlace = await getPlaceDetails({ placeId: resolvedLocation.placeId });
      }
    } catch {
      resolvedLocation = null;
    }
  }

  if (!resolvedPlace) {
    resolvedPlace = await searchPlaceMetadataByText({
      query: `${input.candidate.name} ${input.candidate.address ?? input.location.label}`,
      latitude: input.location.latitude,
      longitude: input.location.longitude
    });
  }

  const latitude = resolvedPlace?.latitude ?? resolvedLocation?.latitude;
  const longitude = resolvedPlace?.longitude ?? resolvedLocation?.longitude;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  const resolvedLatitude = Number(latitude);
  const resolvedLongitude = Number(longitude);

  const distanceMeters = haversineDistanceMeters(
    input.location.latitude,
    input.location.longitude,
    resolvedLatitude,
    resolvedLongitude
  );
  if (distanceMeters > input.radiusMeters) {
    return null;
  }

  const result = ServiceSchema.safeParse({
    id: `scraped-${slugify(resolvedPlace?.placeId ?? `${input.candidate.name}-${input.sourceUrl}`)}`,
    name: input.candidate.name,
    category: input.candidate.category,
    description: input.candidate.description,
    address: resolvedPlace?.address ?? resolvedLocation?.label ?? input.candidate.address ?? "Unknown address",
    latitude: resolvedLatitude,
    longitude: resolvedLongitude,
    placeId: resolvedPlace?.placeId ?? resolvedLocation?.placeId,
    phone: input.candidate.phone ?? resolvedPlace?.phone,
    website: input.candidate.website ?? resolvedPlace?.website,
    hoursText: input.candidate.hoursText,
    openNow: resolvedPlace?.openNow,
    eligibilityNotes: input.candidate.eligibilityNotes,
    sourceType: "scraped",
    sourceName: sourceNameFromUrl(input.sourceUrl),
    sourceUrl: input.sourceUrl,
    confidenceScore: resolvedPlace?.placeId ? 0.74 : 0.62,
    freshnessState: "unknown"
  });

  return result.success ? result.data : null;
}

export async function discoverTrustedWebResources(input: {
  location: LocationContext;
  categories: WebDiscoveryCandidate["category"][];
  radiusMeters: number;
}) {
  const cacheKey = `${input.location.placeId ?? `${input.location.latitude},${input.location.longitude}`}::${input.radiusMeters}::${input.categories.join(",")}`;
  const cached = getCachedValue(discoveryCache, cacheKey);
  if (cached) {
    return cached;
  }

  const warnings: string[] = [];
  if (!hasBraveSearchEnv) {
    warnings.push("Trusted web discovery is unavailable because Brave Search is not configured.");
    return setCachedValue(discoveryCache, cacheKey, { services: [], warnings });
  }
  if (!hasGeminiEnv) {
    warnings.push("Trusted web discovery is unavailable because Gemini is not configured.");
    return setCachedValue(discoveryCache, cacheKey, { services: [], warnings });
  }

  const categoryResults = await Promise.all(
    input.categories.map(async (category) => {
      const searchResults = await searchBraveWeb({
        query: buildDiscoveryQuery(category, input.location),
        count: MAX_SEARCH_RESULTS_PER_CATEGORY
      });
      const trustedResults = searchResults
        .filter((result) => isTrustedDiscoveryUrl(result.link))
        .slice(0, MAX_TRUSTED_PAGES_PER_CATEGORY);
      const services: Service[] = [];

      for (const result of trustedResults) {
        try {
          const pageText = await fetchPageText(result.link);
          const candidates = await extractCandidatesFromPage({
            category,
            location: input.location,
            searchResult: result,
            pageText
          });

          for (const candidate of candidates.slice(0, MAX_CANDIDATES_PER_PAGE)) {
            const validated = await validateDiscoveredCandidate({
              candidate,
              location: input.location,
              radiusMeters: input.radiusMeters,
              sourceUrl: result.link
            });
            if (validated) {
              services.push(validated);
            }
          }
        } catch (error) {
          logError("Trusted web discovery page failed", error, {
            category,
            sourceUrl: result.link,
            braveSearchApiKeyConfigured: Boolean(braveSearchApiKey)
          });
        }
      }

      return services;
    })
  );

  return setCachedValue(discoveryCache, cacheKey, {
    services: categoryResults.flat(),
    warnings
  });
}
