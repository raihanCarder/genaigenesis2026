import { hasGeminiEnv } from "@/lib/env";
import { generateGeminiJson } from "@/lib/ai/gemini/client";
import {
  CACHE_TTL_MS,
  GEMINI_EXTRACTION_TIMEOUT_MS,
  PAGE_FETCH_TIMEOUT_MS,
  discoveryQueryTemplates
} from "@/lib/discovery/trusted-web/constants";
import {
  WebDiscoveryCandidateSchema,
  type WebDiscoveryCandidate
} from "@/lib/discovery/trusted-web/types";
import { stripHtmlToText } from "@/lib/discovery/trusted-web/trust";
import { getCachedValue, setCachedValue, type CacheEntry } from "@/lib/shared/expiring-cache";
import { fetchWithTimeout } from "@/lib/shared/fetch-with-timeout";
import type { LocationContext } from "@/lib/types";
import type { SearchResult } from "@/lib/adapters/brave-search";

const pageCache = new Map<string, CacheEntry<string>>();

export function buildDiscoveryQuery(category: WebDiscoveryCandidate["category"], location: LocationContext) {
  const terms = discoveryQueryTemplates[category];
  const cityContext = [location.label, location.city, location.region].filter(Boolean).join(", ");
  return `${terms.join(" OR ")} near ${cityContext}`;
}

export async function fetchPageText(url: string) {
  const cached = getCachedValue(pageCache, url);
  if (cached) {
    return cached;
  }

  const response = await fetchWithTimeout(url, { cache: "no-store" }, PAGE_FETCH_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(`Unable to fetch trusted page: ${response.status}`);
  }

  const html = await response.text();
  return setCachedValue(pageCache, url, stripHtmlToText(html).slice(0, 16000), CACHE_TTL_MS);
}

export async function extractCandidatesFromPage(input: {
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

  const parsed = await generateGeminiJson<unknown>({
    prompt,
    schemaName: "TrustedWebDiscoveryCandidates",
    temperature: 0.1,
    timeoutMs: GEMINI_EXTRACTION_TIMEOUT_MS
  });
  const validated = WebDiscoveryCandidateSchema.array().safeParse(parsed);
  return validated.success
    ? validated.data.filter((candidate) => candidate.category === input.category)
    : [];
}
