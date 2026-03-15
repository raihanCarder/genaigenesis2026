import { DashboardPayloadSchema, type DashboardPayload, type LocationContext } from "@/lib/types";

const DASHBOARD_CACHE_STORAGE_KEY = "beacon:dashboard-cache:v1";
const MAX_CACHE_ENTRIES = 6;

type DashboardCacheEntry = {
  key: string;
  payload: DashboardPayload;
  savedAt: number;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function buildCacheKey(location: Pick<LocationContext, "latitude" | "longitude">, radius: number) {
  return `${location.latitude.toFixed(5)}:${location.longitude.toFixed(5)}:${radius}`;
}

function readCacheEntries() {
  if (!isBrowser()) {
    return [] as DashboardCacheEntry[];
  }

  try {
    const raw = window.localStorage.getItem(DASHBOARD_CACHE_STORAGE_KEY);
    if (!raw) {
      return [] as DashboardCacheEntry[];
    }

    const parsed = JSON.parse(raw) as Array<{
      key?: string;
      payload?: unknown;
      savedAt?: number;
    }>;

    return parsed.flatMap((entry) => {
      if (!entry?.key || typeof entry.savedAt !== "number") {
        return [];
      }

      const payload = DashboardPayloadSchema.safeParse(entry.payload);
      return payload.success
        ? [
            {
              key: entry.key,
              payload: payload.data,
              savedAt: entry.savedAt
            } satisfies DashboardCacheEntry
          ]
        : [];
    });
  } catch {
    return [] as DashboardCacheEntry[];
  }
}

function writeCacheEntries(entries: DashboardCacheEntry[]) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(
    DASHBOARD_CACHE_STORAGE_KEY,
    JSON.stringify(entries.slice(0, MAX_CACHE_ENTRIES))
  );
}

function upsertCacheEntry(entries: DashboardCacheEntry[], nextEntry: DashboardCacheEntry) {
  return [
    nextEntry,
    ...entries.filter((entry) => entry.key !== nextEntry.key)
  ].slice(0, MAX_CACHE_ENTRIES);
}

export function getCachedDashboardPayload(location: LocationContext, radius = 6000) {
  const cacheKey = buildCacheKey(location, radius);
  return readCacheEntries().find((entry) => entry.key === cacheKey)?.payload ?? null;
}

export function setCachedDashboardPayload(
  requestLocation: LocationContext,
  payload: DashboardPayload,
  radius = 6000
) {
  const now = Date.now();
  let entries = readCacheEntries();

  const requestKey = buildCacheKey(requestLocation, radius);
  entries = upsertCacheEntry(entries, {
    key: requestKey,
    payload,
    savedAt: now
  });

  const resolvedKey = buildCacheKey(payload.location, radius);
  if (resolvedKey !== requestKey) {
    entries = upsertCacheEntry(entries, {
      key: resolvedKey,
      payload,
      savedAt: now
    });
  }

  writeCacheEntries(entries);
}

export function clearCachedDashboardPayload(location: LocationContext, radius = 6000) {
  const cacheKey = buildCacheKey(location, radius);
  writeCacheEntries(readCacheEntries().filter((entry) => entry.key !== cacheKey));
}
