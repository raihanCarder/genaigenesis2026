import { hasGoogleMapsEnv, serverEnv } from "@/lib/env";
import { logError } from "@/lib/logger";
import { ServiceSchema, type LocationContext, type LocationSuggestion, type Service, type ServiceCategory } from "@/lib/types";
import { slugify } from "@/lib/utils";

type ResolvedLocation = LocationContext & {
  normalizedLocation: string;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const PLACES_ERROR_COOLDOWN_MS = 15 * 60 * 1000;

export const TORONTO_CENTER: LocationContext = {
  latitude: 43.6532,
  longitude: -79.3832,
  label: "Downtown Toronto",
  city: "Toronto",
  region: "ON",
  country: "Canada"
};

const geocodeCache = new Map<string, CacheEntry<ResolvedLocation>>();
const autocompleteCache = new Map<string, CacheEntry<LocationSuggestion[]>>();
const placesApiState = {
  disabledUntil: 0
};

const fallbackLocations: Record<string, ResolvedLocation> = {
  toronto: {
    normalizedLocation: "Toronto, ON, Canada",
    label: "Toronto, ON, Canada",
    latitude: 43.6532,
    longitude: -79.3832,
    city: "Toronto",
    region: "ON",
    country: "Canada"
  },
  "downtown toronto": {
    normalizedLocation: "Downtown Toronto, Toronto, ON, Canada",
    label: "Downtown Toronto, Toronto, ON, Canada",
    latitude: 43.6532,
    longitude: -79.3832,
    city: "Toronto",
    region: "ON",
    country: "Canada"
  },
  "yonge and dundas": {
    normalizedLocation: "Yonge-Dundas Square, Toronto, ON, Canada",
    label: "Yonge-Dundas Square, Toronto, ON, Canada",
    latitude: 43.6561,
    longitude: -79.3802,
    city: "Toronto",
    region: "ON",
    country: "Canada"
  }
};

const placeQueries: Partial<Record<ServiceCategory, string>> = {
  clinics: "community health centre",
  bathrooms: "public washroom",
  "wifi-charging": "public library charging wifi",
  services: "community support centre"
};

function usesLegacyPlacesApi() {
  return serverEnv.GOOGLE_PLACES_API_FLAVOR === "legacy";
}

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

function isPlacesApiDisabled() {
  return Date.now() < placesApiState.disabledUntil;
}

function disablePlacesApiTemporarily() {
  placesApiState.disabledUntil = Date.now() + PLACES_ERROR_COOLDOWN_MS;
}

async function buildPlacesApiError(endpoint: string, response: Response) {
  const rawBody = await response.text();
  let detail = rawBody.trim();

  if (rawBody) {
    try {
      const parsed = JSON.parse(rawBody) as {
        error?: { message?: string; status?: string };
      };
      const message = parsed.error?.message;
      const status = parsed.error?.status;
      detail = [status, message].filter(Boolean).join(": ") || detail;
    } catch {
      // Leave the raw payload as-is when it is not JSON.
    }
  }

  return new Error(
    `${endpoint} failed with ${response.status}${
      detail ? ` (${detail})` : ""
    }`
  );
}

function buildLegacyPlacesStatusError(
  endpoint: string,
  payload: {
    status?: string;
    error_message?: string;
  }
) {
  const detail = [payload.status, payload.error_message].filter(Boolean).join(": ");
  return new Error(`${endpoint} failed${detail ? ` (${detail})` : ""}`);
}

function shouldDisablePlacesFromLegacyStatus(status?: string) {
  return status === "REQUEST_DENIED";
}

function logPlacesApiFailure(endpoint: string, error: unknown, context?: Record<string, unknown>) {
  logError(
    `${endpoint} failed. Check that Places API is enabled for this key and that billing and key restrictions allow Places requests.`,
    error,
    context
  );
}

function findAddressComponent(
  components: Array<{ long_name?: string; short_name?: string; types?: string[] }> | undefined,
  matcher: (types: string[]) => boolean,
  key: "long_name" | "short_name" = "long_name"
) {
  const component = components?.find((entry) => matcher(entry.types ?? []));
  const value = component?.[key];
  return typeof value === "string" ? value : undefined;
}

function buildResolvedLocation(
  result: {
    formatted_address?: string;
    place_id?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    address_components?: Array<{
      long_name?: string;
      short_name?: string;
      types?: string[];
    }>;
  },
  input: {
    latitude?: number;
    longitude?: number;
    label?: string;
  }
): ResolvedLocation {
  const label = input.label?.trim() || result.formatted_address || "Selected location";
  const city =
    findAddressComponent(result.address_components, (types) => types.includes("locality")) ??
    findAddressComponent(result.address_components, (types) => types.includes("postal_town")) ??
    findAddressComponent(result.address_components, (types) => types.includes("sublocality")) ??
    findAddressComponent(result.address_components, (types) => types.includes("administrative_area_level_3"));
  const region = findAddressComponent(
    result.address_components,
    (types) => types.includes("administrative_area_level_1"),
    "short_name"
  );
  const country = findAddressComponent(result.address_components, (types) => types.includes("country"));

  return {
    normalizedLocation: label,
    label,
    latitude: input.latitude ?? result.geometry?.location?.lat ?? TORONTO_CENTER.latitude,
    longitude: input.longitude ?? result.geometry?.location?.lng ?? TORONTO_CENTER.longitude,
    placeId: result.place_id,
    city,
    region,
    country
  };
}

function getFallbackLocation(input: {
  location?: string;
  latitude?: number;
  longitude?: number;
  label?: string;
}) {
  if (typeof input.latitude === "number" && typeof input.longitude === "number") {
    const label = input.label?.trim() || "Current location";
    return {
      normalizedLocation: label,
      label,
      latitude: input.latitude,
      longitude: input.longitude
    } satisfies ResolvedLocation;
  }

  const normalizedInput = input.location?.trim().toLowerCase();
  return fallbackLocations[normalizedInput ?? ""] ?? fallbackLocations.toronto;
}

function getFallbackSuggestions(query: string) {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) {
    return [] satisfies LocationSuggestion[];
  }

  return Object.values(fallbackLocations)
    .filter(
      (location, index, locations) =>
        locations.findIndex((candidate) => candidate.label === location.label) === index &&
        location.label.toLowerCase().includes(normalized)
    )
    .map((location) => ({
      label: location.label,
      primaryText: location.label.split(",")[0] ?? location.label,
      secondaryText: location.label.includes(",")
        ? location.label.split(",").slice(1).join(",").trim()
        : undefined
    }));
}

export async function geocodeLocation(input: {
  location?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  label?: string;
}) {
  const hasCoordinates =
    Number.isFinite(input.latitude) && Number.isFinite(input.longitude);
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
    return setCachedValue(geocodeCache, cacheKey, getFallbackLocation(input));
  }

  const params = new URLSearchParams({
    key: serverEnv.GOOGLE_MAPS_API_KEY ?? ""
  });
  if (input.placeId) {
    params.set("place_id", input.placeId);
  } else if (hasCoordinates) {
    params.set("latlng", `${input.latitude},${input.longitude}`);
  } else if (trimmedLocation) {
    params.set("address", trimmedLocation);
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
    { cache: "no-store" }
  );
  const payload = (await response.json()) as {
    results?: Array<{
      formatted_address?: string;
      place_id?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
      address_components?: Array<{
        long_name?: string;
        short_name?: string;
        types?: string[];
      }>;
    }>;
    status?: string;
  };
  const result = payload.results?.[0];
  if (!result) {
    throw new Error(`Unable to geocode location. Status: ${payload.status ?? "unknown"}`);
  }

  return setCachedValue(geocodeCache, cacheKey, buildResolvedLocation(result, input));
}

export async function autocompleteLocations(input: {
  query: string;
  sessionToken?: string;
}) {
  const query = input.query.trim();
  if (query.length < 2) {
    return [] satisfies LocationSuggestion[];
  }

  const cacheKey = query.toLowerCase();
  const cached = getCachedValue(autocompleteCache, cacheKey);
  if (cached) {
    return cached;
  }

  if (!hasGoogleMapsEnv || isPlacesApiDisabled()) {
    return setCachedValue(autocompleteCache, cacheKey, getFallbackSuggestions(query));
  }

  try {
    if (usesLegacyPlacesApi()) {
      const params = new URLSearchParams({
        input: query,
        key: serverEnv.GOOGLE_MAPS_API_KEY ?? "",
        types: "geocode"
      });
      if (input.sessionToken) {
        params.set("sessiontoken", input.sessionToken);
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
        { cache: "no-store" }
      );
      const payload = (await response.json()) as {
        status?: string;
        error_message?: string;
        predictions?: Array<{
          description?: string;
          place_id?: string;
          structured_formatting?: {
            main_text?: string;
            secondary_text?: string;
          };
        }>;
      };

      if (payload.status && payload.status !== "OK" && payload.status !== "ZERO_RESULTS") {
        if (shouldDisablePlacesFromLegacyStatus(payload.status)) {
          disablePlacesApiTemporarily();
        }
        throw buildLegacyPlacesStatusError("Google Places autocomplete", payload);
      }

      const suggestions = (payload.predictions ?? []).flatMap((prediction) =>
        prediction.description
          ? [
              {
                placeId: prediction.place_id,
                label: prediction.description,
                primaryText:
                  prediction.structured_formatting?.main_text ?? prediction.description,
                secondaryText: prediction.structured_formatting?.secondary_text
              }
            ]
          : []
      );

      return setCachedValue(autocompleteCache, cacheKey, suggestions);
    }

    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": serverEnv.GOOGLE_MAPS_API_KEY ?? "",
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text"
      },
      body: JSON.stringify({
        input: query,
        includeQueryPredictions: false,
        sessionToken: input.sessionToken
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const error = await buildPlacesApiError("Google Places autocomplete", response);
      if (response.status === 403) {
        disablePlacesApiTemporarily();
      }
      throw error;
    }

    const payload = (await response.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          placeId?: string;
          text?: { text?: string };
          structuredFormat?: {
            mainText?: { text?: string };
            secondaryText?: { text?: string };
          };
        };
      }>;
    };

    const suggestions = (payload.suggestions ?? [])
      .map((suggestion) => suggestion.placePrediction)
      .flatMap((prediction) =>
        prediction?.text?.text
          ? [
              {
                placeId: prediction.placeId,
                label: prediction.text.text,
                primaryText: prediction.structuredFormat?.mainText?.text ?? prediction.text.text,
                secondaryText: prediction.structuredFormat?.secondaryText?.text
              }
            ]
          : []
      );

    return setCachedValue(autocompleteCache, cacheKey, suggestions);
  } catch (error) {
    logPlacesApiFailure("Google Places autocomplete", error, { query });
    return setCachedValue(autocompleteCache, cacheKey, getFallbackSuggestions(query));
  }
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
  if (!hasGoogleMapsEnv || !query || isPlacesApiDisabled()) {
    return [] satisfies Service[];
  }

  try {
    if (usesLegacyPlacesApi()) {
      const params = new URLSearchParams({
        query,
        location: `${input.latitude},${input.longitude}`,
        radius: "5000",
        key: serverEnv.GOOGLE_MAPS_API_KEY ?? ""
      });
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`,
        { cache: "no-store" }
      );
      const payload = (await response.json()) as {
        status?: string;
        error_message?: string;
        results?: Array<{
          place_id?: string;
          name?: string;
          formatted_address?: string;
          geometry?: { location?: { lat?: number; lng?: number } };
          opening_hours?: { open_now?: boolean };
        }>;
      };

      if (payload.status && payload.status !== "OK" && payload.status !== "ZERO_RESULTS") {
        if (shouldDisablePlacesFromLegacyStatus(payload.status)) {
          disablePlacesApiTemporarily();
        }
        throw buildLegacyPlacesStatusError("Google Places search", payload);
      }

      return (payload.results ?? [])
        .map((place) =>
          ServiceSchema.safeParse({
            id: `maps-${slugify(place.place_id ?? place.name ?? "place")}`,
            name: place.name ?? "Unnamed place",
            category: input.category,
            address: place.formatted_address ?? "Unknown address",
            latitude: place.geometry?.location?.lat ?? input.latitude,
            longitude: place.geometry?.location?.lng ?? input.longitude,
            openNow: place.opening_hours?.open_now,
            sourceType: "maps",
            sourceName: "Google Places",
            confidenceScore: 0.72,
            freshnessState: "unknown"
          })
        )
        .flatMap((result) => (result.success ? [result.data] : []));
    }

    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": serverEnv.GOOGLE_MAPS_API_KEY ?? "",
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.currentOpeningHours,places.websiteUri"
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: {
          circle: {
            center: {
              latitude: input.latitude,
              longitude: input.longitude
            },
            radius: 5000
          }
        },
        maxResultCount: 8
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      const error = await buildPlacesApiError("Google Places search", response);
      if (response.status === 403) {
        disablePlacesApiTemporarily();
      }
      throw error;
    }

    const payload = (await response.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
        currentOpeningHours?: { openNow?: boolean };
        websiteUri?: string;
      }>;
    };

    return (payload.places ?? [])
      .map((place) =>
        ServiceSchema.safeParse({
          id: `maps-${slugify(place.id ?? place.displayName?.text ?? "place")}`,
          name: place.displayName?.text ?? "Unnamed place",
          category: input.category,
          address: place.formattedAddress ?? "Unknown address",
          latitude: place.location?.latitude ?? input.latitude,
          longitude: place.location?.longitude ?? input.longitude,
          website: place.websiteUri,
          openNow: place.currentOpeningHours?.openNow,
          sourceType: "maps",
          sourceName: "Google Places",
          sourceUrl: place.websiteUri,
          confidenceScore: 0.72,
          freshnessState: "unknown"
        })
      )
      .flatMap((result) => (result.success ? [result.data] : []));
  } catch (error) {
    logPlacesApiFailure("Google Places search", error, { category: input.category });
    return [];
  }
}
