import { braveSearchApiKey, hasBraveSearchEnv, hasGeminiEnv } from "@/lib/env";
import { searchBraveWeb } from "@/lib/adapters/brave-search";
import {
  CACHE_TTL_MS,
  MAX_CANDIDATES_PER_PAGE,
  MAX_SEARCH_RESULTS_PER_CATEGORY,
  MAX_TRUSTED_PAGES_PER_CATEGORY
} from "@/lib/discovery/trusted-web/constants";
import { buildDiscoveryQuery, extractCandidatesFromPage, fetchPageText } from "@/lib/discovery/trusted-web/extract";
import { isTrustedDiscoveryUrl } from "@/lib/discovery/trusted-web/trust";
import { validateDiscoveredCandidate } from "@/lib/discovery/trusted-web/validation";
import { type DiscoveryResult, type WebDiscoveryCandidate } from "@/lib/discovery/trusted-web/types";
import { logError } from "@/lib/logger";
import { getCachedValue, setCachedValue, type CacheEntry } from "@/lib/shared/expiring-cache";
import type { LocationContext } from "@/lib/types";

const discoveryCache = new Map<string, CacheEntry<DiscoveryResult>>();

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
    return setCachedValue(discoveryCache, cacheKey, { services: [], warnings }, CACHE_TTL_MS);
  }
  if (!hasGeminiEnv) {
    warnings.push("Trusted web discovery is unavailable because Gemini is not configured.");
    return setCachedValue(discoveryCache, cacheKey, { services: [], warnings }, CACHE_TTL_MS);
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
      const services = [];

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

  return setCachedValue(
    discoveryCache,
    cacheKey,
    {
      services: categoryResults.flat(),
      warnings
    },
    CACHE_TTL_MS
  );
}
