import { hasGoogleMapsEnv } from "@/lib/env";
import { CACHE_TTL_MS, placeQueries } from "@/lib/location/google-maps/constants";
import { getFallbackLocation } from "@/lib/location/google-maps/fallbacks";
import {
  autocompleteLocations,
  fetchGeocodeResult,
  getPlaceDetails,
  searchPlaceMatches,
  searchPlaceMetadataByText
} from "@/lib/location/google-maps/client";
import {
  buildResolvedLocation,
  buildResolvedLocationFromPlaceMetadata,
  buildServiceFromPlaceMatch
} from "@/lib/location/google-maps/parsers";
import {
  geocodeCache,
  isPlacesApiDisabled,
  placeSearchCache
} from "@/lib/location/google-maps/state";
import { getCachedValue, setCachedValue } from "@/lib/shared/expiring-cache";
import { type LocationSuggestion, type Service, type ServiceCategory } from "@/lib/types";

export async function geocodeLocation(input: {
  location?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  label?: string;
}) {
  const hasCoordinates = Number.isFinite(input.latitude) && Number.isFinite(input.longitude);
  const trimmedLocation = input.location?.trim();
  if (!trimmedLocation && !input.placeId && !hasCoordinates) {
    throw new Error("Location is required.");
  }

  const cacheKey =
    typeof input.placeId === "string" && input.placeId
      ? `placeId:${input.placeId}`
      : hasCoordinates
        ? `latlng:${input.latitude},${input.longitude}`
        : `address:${trimmedLocation?.toLowerCase()}`;

  const cached = getCachedValue(geocodeCache, cacheKey);
  if (cached) {
    return cached;
  }

  if (!hasGoogleMapsEnv) {
    return setCachedValue(geocodeCache, cacheKey, getFallbackLocation(input), CACHE_TTL_MS);
  }

  if (input.placeId) {
    const place = await getPlaceDetails({ placeId: input.placeId });
    if (place) {
      return setCachedValue(
        geocodeCache,
        cacheKey,
        buildResolvedLocationFromPlaceMetadata(place, { label: input.label }),
        CACHE_TTL_MS
      );
    }
  }

  const result = await fetchGeocodeResult(input);
  const hydratedPlace = result.place_id
    ? await getPlaceDetails({ placeId: result.place_id })
    : null;

  const resolved = hydratedPlace
    ? buildResolvedLocationFromPlaceMetadata(hydratedPlace, { label: input.label })
    : buildResolvedLocation(result, input);

  return setCachedValue(geocodeCache, cacheKey, resolved, CACHE_TTL_MS);
}

export async function autocompleteLocationsWithFallback(input: {
  query: string;
  sessionToken?: string;
}) {
  return autocompleteLocations(input);
}

export function buildDirectionsUrl(service: Pick<Service, "latitude" | "longitude">) {
  const params = new URLSearchParams({
    api: "1",
    destination: `${service.latitude},${service.longitude}`
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export async function searchSupplementalPlaces(input: {
  latitude: number;
  longitude: number;
  category?: ServiceCategory;
}) {
  const query = input.category ? placeQueries[input.category] : undefined;
  const cacheKey = `${input.category ?? "all"}::${input.latitude},${input.longitude}`;
  const cached = getCachedValue(placeSearchCache, cacheKey);
  if (cached) {
    return cached;
  }

  if (!hasGoogleMapsEnv || !query || isPlacesApiDisabled()) {
    return [] satisfies Service[];
  }

  const matches = await searchPlaceMatches({
    query,
    latitude: input.latitude,
    longitude: input.longitude
  });

  const services = matches
    .map((place) =>
      buildServiceFromPlaceMatch(place, input.category, {
        latitude: input.latitude,
        longitude: input.longitude
      })
    )
    .flatMap((parsed) => (parsed.success ? [parsed.data] : []));

  return setCachedValue(placeSearchCache, cacheKey, services, CACHE_TTL_MS);
}

export {
  autocompleteLocationsWithFallback as autocompleteLocations,
  getPlaceDetails,
  searchPlaceMetadataByText
};
