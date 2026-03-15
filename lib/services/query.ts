import { searchSupplementalPlaces } from "@/lib/adapters/google-maps";
import { findDashboardServiceById } from "@/lib/services/dashboard";
import { getCuratedServices, withDistance } from "@/lib/services/normalization";
import { rankServices } from "@/lib/services/ranking";
import type { ServiceCategory, ServiceWithMeta } from "@/lib/types";
import { haversineDistanceMeters } from "@/lib/utils";

type SearchParams = {
  latitude: number;
  longitude: number;
  category?: ServiceCategory;
  radius?: number;
  openNow?: boolean;
};

const supplementalCategories: ServiceCategory[] = [
  "food",
  "free-food-events",
  "showers",
  "shelters",
  "bathrooms",
  "clinics",
  "services",
  "wifi-charging"
];

function matchesCategory(service: ServiceWithMeta, category?: ServiceCategory) {
  return !category || service.category === category;
}

function matchesOpenNow(service: ServiceWithMeta, openNow?: boolean) {
  return !openNow || service.openNow === true;
}

function dedupeServices(services: ServiceWithMeta[]) {
  const seen = new Set<string>();
  return services.filter((service) => {
    const key = `${service.name.toLowerCase()}::${service.address.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export async function searchServices(params: SearchParams) {
  const radius = params.radius ?? 5000;
  const curated = getCuratedServices().map((service) =>
    withDistance(
      service,
      haversineDistanceMeters(
        params.latitude,
        params.longitude,
        service.latitude,
        service.longitude
      )
    )
  );
  const supplementalResults = await Promise.all(
    (params.category ? [params.category] : supplementalCategories).map((category) =>
      searchSupplementalPlaces({
        latitude: params.latitude,
        longitude: params.longitude,
        category
      })
    )
  );
  const supplemental = supplementalResults.flat().map((service) =>
    withDistance(
      service,
      haversineDistanceMeters(
        params.latitude,
        params.longitude,
        service.latitude,
        service.longitude
      )
    )
  );

  return rankServices(
    dedupeServices([...curated, ...supplemental]).filter(
      (service) =>
        matchesCategory(service, params.category) &&
        matchesOpenNow(service, params.openNow) &&
        (service.distanceMeters ?? 0) <= radius
    ),
    params.openNow
  );
}

export async function getServiceById(input: {
  id: string;
  latitude?: number;
  longitude?: number;
  label?: string;
  placeId?: string;
  city?: string;
  region?: string;
  country?: string;
}) {
  const curated = getCuratedServices();
  const match = curated.find((service) => service.id === input.id);
  if (match) {
    return withDistance(
      match,
      input.latitude && input.longitude
        ? haversineDistanceMeters(input.latitude, input.longitude, match.latitude, match.longitude)
        : undefined
    );
  }
  if (input.latitude === undefined || input.longitude === undefined) {
    return null;
  }
  const services = await searchServices({
    latitude: input.latitude,
    longitude: input.longitude
  });
  const supplementalMatch = services.find((service) => service.id === input.id);
  if (supplementalMatch) {
    return supplementalMatch;
  }

  return findDashboardServiceById({
    id: input.id,
    location: {
      latitude: input.latitude,
      longitude: input.longitude,
      label: input.label ?? "Selected location",
      placeId: input.placeId,
      city: input.city,
      region: input.region,
      country: input.country
    }
  });
}
