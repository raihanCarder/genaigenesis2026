import { braveSearchApiKey, hasBraveSearchEnv } from "@/lib/env";
import { logError } from "@/lib/logger";

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

export type SearchResult = {
  title: string;
  link: string;
  snippet?: string;
  displayLink?: string;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_TIMEOUT_MS = 4000;
const searchCache = new Map<string, CacheEntry<SearchResult[]>>();

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

function getDisplayLink(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
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

export async function searchBraveWeb(input: {
  query: string;
  count?: number;
}) {
  const query = input.query.trim();
  if (!query || !hasBraveSearchEnv) {
    return [] satisfies SearchResult[];
  }

  const cacheKey = `${query.toLowerCase()}::${input.count ?? 6}`;
  const cached = getCachedValue(searchCache, cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const params = new URLSearchParams({
      q: query,
      count: String(input.count ?? 6),
      safesearch: "strict",
      search_lang: "en",
      text_decorations: "false",
      extra_snippets: "true"
    });
    const response = await fetchWithTimeout(
      `https://api.search.brave.com/res/v1/web/search?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": braveSearchApiKey ?? ""
        },
        cache: "no-store"
      },
      SEARCH_TIMEOUT_MS
    );
    if (!response.ok) {
      throw new Error(`Brave Search failed with ${response.status}`);
    }

    const payload = (await response.json()) as {
      web?: {
        results?: Array<{
          title?: string;
          url?: string;
          description?: string;
          extra_snippets?: string[];
        }>;
      };
    };

    const results = (payload.web?.results ?? []).flatMap((item) =>
      item.url && item.title
        ? [
            {
              title: item.title,
              link: item.url,
              snippet: [item.description, ...(item.extra_snippets ?? [])]
                .filter(Boolean)
                .join(" "),
              displayLink: getDisplayLink(item.url)
            }
          ]
        : []
    );

    return setCachedValue(searchCache, cacheKey, results);
  } catch (error) {
    logError("Brave Search failed", error, { query });
    return setCachedValue(searchCache, cacheKey, []);
  }
}
