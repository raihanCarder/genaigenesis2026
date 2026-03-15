import { discoverTrustedWebResources } from "@/lib/adapters/web-discovery";
import {
  geocodeLocation,
  getPlaceDetails,
  searchSupplementalPlaces
} from "@/lib/adapters/google-maps";
import { getCuratedServices, withDistance } from "@/lib/services/normalization";
import { rankServices } from "@/lib/services/ranking";
import {
  type DashboardPayload,
  type LocationContext,
  type LocationPlaceMetadata,
  type Service,
  type ServiceCategory,
  type ServiceWithMeta
} from "@/lib/types";
import { haversineDistanceMeters } from "@/lib/utils";

const dashboardPlaceCategories: ServiceCategory[] = [
  "food",
  "free-food-events",
  "shelters",
  "showers",
  "services",
  "clinics",
  "bathrooms",
  "wifi-charging"
];

const dashboardWebCategories: Array<
  Extract<ServiceCategory, "food" | "free-food-events" | "shelters" | "showers" | "services" | "clinics">
> = ["food", "free-food-events", "shelters", "showers", "services", "clinics"];
const MAX_SERVICES_PER_CATEGORY = 7;
const WEB_DISCOVERY_TIMEOUT_MS = 7000;

const sourcePriority: Record<Service["sourceType"], number> = {
  manual: 4,
  "open-data": 3,
  scraped: 2,
  maps: 1
};

function normalizeKeyValue(value: string | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildDeduplicationKey(service: Pick<Service, "placeId" | "name" | "address">) {
  return service.placeId
    ? `place:${service.placeId}`
    : `text:${normalizeKeyValue(service.name)}::${normalizeKeyValue(service.address)}`;
}

function selectBaseService(left: Service, right: Service) {
  if ((sourcePriority[right.sourceType] ?? 0) > (sourcePriority[left.sourceType] ?? 0)) {
    return right;
  }
  return left;
}

function mergeTags(left?: string[], right?: string[]) {
  const values = [...(left ?? []), ...(right ?? [])];
  return values.length > 0 ? Array.from(new Set(values)) : undefined;
}

function mergeServiceRecords(existing: Service, incoming: Service) {
  const base = selectBaseService(existing, incoming);
  const other = base === existing ? incoming : existing;
  const scraped = [existing, incoming].find((service) => service.sourceType === "scraped");
  const google = [existing, incoming].find((service) => service.sourceType === "maps");

  return {
    ...base,
    placeId: existing.placeId ?? incoming.placeId,
    description: scraped?.description ?? base.description ?? other.description,
    address:
      scraped?.address ??
      (google && scraped ? google.address : undefined) ??
      base.address ??
      other.address,
    latitude: google && scraped ? google.latitude : base.latitude,
    longitude: google && scraped ? google.longitude : base.longitude,
    phone: google?.phone ?? base.phone ?? other.phone,
    website: google?.website ?? base.website ?? other.website,
    hoursText: scraped?.hoursText ?? base.hoursText ?? other.hoursText,
    openNow: google?.openNow ?? base.openNow ?? other.openNow,
    eligibilityNotes:
      scraped?.eligibilityNotes ?? base.eligibilityNotes ?? other.eligibilityNotes,
    sourceUrl: scraped?.sourceUrl ?? base.sourceUrl ?? other.sourceUrl,
    confidenceScore: Math.max(base.confidenceScore ?? 0, other.confidenceScore ?? 0) || undefined,
    tags: mergeTags(base.tags, other.tags)
  } satisfies Service;
}

export function mergeDashboardServices(services: Service[]) {
  const byKey = new Map<string, Service>();

  for (const service of services) {
    const primaryKey = buildDeduplicationKey(service);
    const secondaryKey = `text:${normalizeKeyValue(service.name)}::${normalizeKeyValue(service.address)}`;
    const existing = byKey.get(primaryKey) ?? (service.placeId ? byKey.get(secondaryKey) : null);
    const merged = existing ? mergeServiceRecords(existing, service) : service;

    byKey.set(primaryKey, merged);
    byKey.set(secondaryKey, merged);
    if (merged.placeId) {
      byKey.set(`place:${merged.placeId}`, merged);
    }
  }

  const seenIds = new Set<string>();
  return Array.from(byKey.values()).filter((service) => {
    if (seenIds.has(service.id)) {
      return false;
    }
    seenIds.add(service.id);
    return true;
  });
}

function addDistance(location: LocationContext, service: Service) {
  return withDistance(
    service,
    haversineDistanceMeters(
      location.latitude,
      location.longitude,
      service.latitude,
      service.longitude
    )
  );
}

function filterWithinRadius(services: ServiceWithMeta[], radius: number) {
  return services.filter((service) => (service.distanceMeters ?? 0) <= radius);
}

function limitServicesPerCategory(services: ServiceWithMeta[]) {
  const counts = new Map<ServiceCategory, number>();
  return services.filter((service) => {
    const count = counts.get(service.category) ?? 0;
    if (count >= MAX_SERVICES_PER_CATEGORY) {
      return false;
    }
    counts.set(service.category, count + 1);
    return true;
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timeoutId = setTimeout(() => resolve(fallback), ms);
      })
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function resolveDashboardLocation(location: LocationContext) {
  const resolved = await geocodeLocation({
    placeId: location.placeId,
    latitude: location.latitude,
    longitude: location.longitude,
    label: location.label
  });

  const resolvedLocation: LocationContext = {
    latitude: resolved.latitude,
    longitude: resolved.longitude,
    label: resolved.label,
    placeId: resolved.placeId,
    city: resolved.city,
    region: resolved.region,
    country: resolved.country
  };

  const anchorPlace = resolved.placeId ? await getPlaceDetails({ placeId: resolved.placeId }) : null;
  return {
    location: resolvedLocation,
    anchorPlace
  };
}

export async function getDashboardPayload(input: {
  location: LocationContext;
  radius?: number;
}): Promise<DashboardPayload> {
  const radius = input.radius ?? 6000;
  const warnings: string[] = [];
  const { location, anchorPlace } = await resolveDashboardLocation(input.location);

  const curated = getCuratedServices();
  const placeResults = await Promise.all(
    dashboardPlaceCategories.map((category) =>
      searchSupplementalPlaces({
        latitude: location.latitude,
        longitude: location.longitude,
        category
      })
    )
  );
  const webResults = await withTimeout(
    discoverTrustedWebResources({
      location,
      categories: dashboardWebCategories,
      radiusMeters: radius
    }),
    WEB_DISCOVERY_TIMEOUT_MS,
    {
      services: [],
      warnings: [
        "Trusted web discovery timed out. Showing curated and Google Places results first."
      ]
    }
  );

  warnings.push(...webResults.warnings);
  warnings.push("Verify hours and eligibility before traveling to time-sensitive services.");

  const mergedServices = mergeDashboardServices([
    ...curated,
    ...placeResults.flat(),
    ...webResults.services
  ]);
  const services = limitServicesPerCategory(
    rankServices(
      filterWithinRadius(
        mergedServices.map((service) => addDistance(location, service)),
        radius
      )
    )
  );

  return {
    location,
    anchorPlace: anchorPlace as LocationPlaceMetadata | null,
    services,
    warnings: Array.from(new Set(warnings))
  };
}

export async function findDashboardServiceById(input: {
  id: string;
  location: LocationContext;
  radius?: number;
}) {
  const payload = await getDashboardPayload(input);
  return payload.services.find((service) => service.id === input.id) ?? null;
}
