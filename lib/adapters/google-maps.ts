import { hasGoogleMapsEnv, serverEnv } from "@/lib/env";
import { logError } from "@/lib/logger";
import {
  ServiceSchema,
  type LocationContext,
  type LocationPlaceMetadata,
  type LocationSuggestion,
  type Service,
  type ServiceCategory
} from "@/lib/types";
import { slugify } from "@/lib/utils";

type ResolvedLocation = LocationContext & {
  normalizedLocation: string;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

type AddressComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};

type LegacyGeocodeResult = {
  formatted_address?: string;
  place_id?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  address_components?: AddressComponent[];
};

type PlaceTextMatch = {
  placeId?: string;
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  phone?: string;
  openNow?: boolean;
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const PLACES_ERROR_COOLDOWN_MS = 15 * 60 * 1000;
const GOOGLE_FETCH_TIMEOUT_MS = 4000;

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
const placeDetailsCache = new Map<string, CacheEntry<LocationPlaceMetadata | null>>();
const placeSearchCache = new Map<string, CacheEntry<Service[]>>();
const placeTextMatchCache = new Map<string, CacheEntry<LocationPlaceMetadata | null>>();
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
  food: "food bank OR community meal OR soup kitchen",
  "free-food-events": "community meal OR free lunch OR soup kitchen",
  showers: "public shower OR hygiene program",
  shelters: "homeless shelter OR emergency shelter",
  clinics: "community health centre",
  bathrooms: "public washroom",
  "wifi-charging": "public library charging wifi",
  services: "community support centre",
  "legal-help": "legal clinic"
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
      // Preserve raw payload when Google does not return JSON.
    }
  }

  return new Error(
    `${endpoint} failed with ${response.status}${detail ? ` (${detail})` : ""}`
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
  components: AddressComponent[] | undefined,
  matcher: (types: string[]) => boolean,
  key: "long_name" | "short_name" = "long_name"
) {
  const component = components?.find((entry) => matcher(entry.types ?? []));
  const value = component?.[key];
  return typeof value === "string" ? value : undefined;
}

function extractLocationFields(components: AddressComponent[] | undefined) {
  const city =
    findAddressComponent(components, (types) => types.includes("locality")) ??
    findAddressComponent(components, (types) => types.includes("postal_town")) ??
    findAddressComponent(components, (types) => types.includes("sublocality")) ??
    findAddressComponent(components, (types) => types.includes("administrative_area_level_3"));
  const region = findAddressComponent(
    components,
    (types) => types.includes("administrative_area_level_1"),
    "short_name"
  );
  const country = findAddressComponent(components, (types) => types.includes("country"));

  return {
    city,
    region,
    country
  };
}

function buildResolvedLocation(
  result: LegacyGeocodeResult,
  input: {
    latitude?: number;
    longitude?: number;
    label?: string;
  }
): ResolvedLocation {
  const inputLabel = input.label?.trim();
  const label =
    inputLabel && inputLabel.toLowerCase() !== "current location"
      ? inputLabel
      : result.formatted_address || "Selected location";
  const locationFields = extractLocationFields(result.address_components);

  return {
    normalizedLocation: result.formatted_address ?? label,
    label,
    latitude: input.latitude ?? result.geometry?.location?.lat ?? TORONTO_CENTER.latitude,
    longitude: input.longitude ?? result.geometry?.location?.lng ?? TORONTO_CENTER.longitude,
    placeId: result.place_id,
    ...locationFields
  };
}

function buildResolvedLocationFromPlaceMetadata(
  place: LocationPlaceMetadata,
  input: {
    label?: string;
  } = {}
): ResolvedLocation {
  const inputLabel = input.label?.trim();
  const label =
    inputLabel && inputLabel.toLowerCase() !== "current location"
      ? inputLabel
      : place.address || place.name;
  return {
    normalizedLocation: place.address || label,
    label,
    latitude: place.latitude,
    longitude: place.longitude,
    placeId: place.placeId,
    city: place.city,
    region: place.region,
    country: place.country
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

function parseLegacyPlaceMetadata(result: {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  address_components?: AddressComponent[];
  types?: string[];
  website?: string;
  formatted_phone_number?: string;
  opening_hours?: { open_now?: boolean };
}): LocationPlaceMetadata | null {
  if (!result.place_id) {
    return null;
  }

  const locationFields = extractLocationFields(result.address_components);
  return {
    placeId: result.place_id,
    name: result.name ?? result.formatted_address ?? "Selected place",
    address: result.formatted_address ?? result.name ?? "Unknown address",
    latitude: result.geometry?.location?.lat ?? TORONTO_CENTER.latitude,
    longitude: result.geometry?.location?.lng ?? TORONTO_CENTER.longitude,
    types: result.types ?? [],
    website: result.website,
    phone: result.formatted_phone_number,
    openNow: result.opening_hours?.open_now,
    ...locationFields
  };
}

function parseNewPlaceMetadata(result: {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  websiteUri?: string;
  nationalPhoneNumber?: string;
  currentOpeningHours?: { openNow?: boolean };
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];
  }>;
}): LocationPlaceMetadata | null {
  if (!result.id) {
    return null;
  }

  const components = result.addressComponents?.map((component) => ({
    long_name: component.longText,
    short_name: component.shortText,
    types: component.types
  }));
  const locationFields = extractLocationFields(components);

  return {
    placeId: result.id,
    name: result.displayName?.text ?? result.formattedAddress ?? "Selected place",
    address: result.formattedAddress ?? result.displayName?.text ?? "Unknown address",
    latitude: result.location?.latitude ?? TORONTO_CENTER.latitude,
    longitude: result.location?.longitude ?? TORONTO_CENTER.longitude,
    types: result.types ?? [],
    website: result.websiteUri,
    phone: result.nationalPhoneNumber,
    openNow: result.currentOpeningHours?.openNow,
    ...locationFields
  };
}

async function fetchGeocodeResult(input: {
  location?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
}) {
  const hasCoordinates = Number.isFinite(input.latitude) && Number.isFinite(input.longitude);
  const trimmedLocation = input.location?.trim();
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

  const response = await fetchWithTimeout(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
    { cache: "no-store" },
    GOOGLE_FETCH_TIMEOUT_MS
  );
  const payload = (await response.json()) as {
    results?: LegacyGeocodeResult[];
    status?: string;
  };

  const result = payload.results?.[0];
  if (!result) {
    throw new Error(`Unable to geocode location. Status: ${payload.status ?? "unknown"}`);
  }

  return result;
}

function buildServiceFromPlaceMatch(
  place: PlaceTextMatch,
  category: ServiceCategory | undefined,
  fallbackCoordinates: {
    latitude: number;
    longitude: number;
  }
) {
  return ServiceSchema.safeParse({
    id: `maps-${slugify(place.placeId ?? place.name ?? place.address ?? "place")}`,
    name: place.name ?? "Unnamed place",
    category,
    address: place.address ?? "Unknown address",
    latitude: place.latitude ?? fallbackCoordinates.latitude,
    longitude: place.longitude ?? fallbackCoordinates.longitude,
    placeId: place.placeId,
    website: place.website,
    phone: place.phone,
    openNow: place.openNow,
    sourceType: "maps",
    sourceName: "Google Places",
    sourceUrl: place.website,
    confidenceScore: 0.72,
    freshnessState: "unknown"
  });
}

async function searchPlaceMatches(input: {
  query: string;
  latitude?: number;
  longitude?: number;
  maxResultCount?: number;
}) {
  if (!hasGoogleMapsEnv || isPlacesApiDisabled()) {
    return [] satisfies PlaceTextMatch[];
  }

  try {
    if (usesLegacyPlacesApi()) {
      const params = new URLSearchParams({
        query: input.query,
        key: serverEnv.GOOGLE_MAPS_API_KEY ?? ""
      });

      if (Number.isFinite(input.latitude) && Number.isFinite(input.longitude)) {
        params.set("location", `${input.latitude},${input.longitude}`);
        params.set("radius", "5000");
      }

      const response = await fetchWithTimeout(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`,
        { cache: "no-store" },
        GOOGLE_FETCH_TIMEOUT_MS
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

      return (payload.results ?? []).map((place) => ({
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        latitude: place.geometry?.location?.lat,
        longitude: place.geometry?.location?.lng,
        openNow: place.opening_hours?.open_now
      }));
    }

    const response = await fetchWithTimeout(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": serverEnv.GOOGLE_MAPS_API_KEY ?? "",
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.currentOpeningHours,places.websiteUri,places.nationalPhoneNumber"
        },
        body: JSON.stringify({
          textQuery: input.query,
          locationBias:
            Number.isFinite(input.latitude) && Number.isFinite(input.longitude)
              ? {
                  circle: {
                    center: {
                      latitude: input.latitude,
                      longitude: input.longitude
                    },
                    radius: 5000
                  }
                }
              : undefined,
          maxResultCount: input.maxResultCount ?? 8
        }),
        cache: "no-store"
      },
      GOOGLE_FETCH_TIMEOUT_MS
    );

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
        nationalPhoneNumber?: string;
      }>;
    };

    return (payload.places ?? []).map((place) => ({
      placeId: place.id,
      name: place.displayName?.text,
      address: place.formattedAddress,
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
      website: place.websiteUri,
      phone: place.nationalPhoneNumber,
      openNow: place.currentOpeningHours?.openNow
    }));
  } catch (error) {
    logPlacesApiFailure("Google Places search", error, { query: input.query });
    return [];
  }
}

export async function getPlaceDetails(input: { placeId: string }) {
  const placeId = input.placeId.trim();
  if (!placeId || !hasGoogleMapsEnv || isPlacesApiDisabled()) {
    return null;
  }

  const cacheKey = `placeId:${placeId}`;
  const cached = getCachedValue(placeDetailsCache, cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    if (usesLegacyPlacesApi()) {
      const params = new URLSearchParams({
        place_id: placeId,
        key: serverEnv.GOOGLE_MAPS_API_KEY ?? "",
        fields:
          "place_id,name,formatted_address,geometry,address_component,types,website,formatted_phone_number,opening_hours"
      });
      const response = await fetchWithTimeout(
        `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`,
        { cache: "no-store" },
        GOOGLE_FETCH_TIMEOUT_MS
      );
      const payload = (await response.json()) as {
        status?: string;
        error_message?: string;
        result?: {
          place_id?: string;
          name?: string;
          formatted_address?: string;
          geometry?: { location?: { lat?: number; lng?: number } };
          address_components?: AddressComponent[];
          types?: string[];
          website?: string;
          formatted_phone_number?: string;
          opening_hours?: { open_now?: boolean };
        };
      };

      if (payload.status && payload.status !== "OK") {
        if (shouldDisablePlacesFromLegacyStatus(payload.status)) {
          disablePlacesApiTemporarily();
        }
        throw buildLegacyPlacesStatusError("Google Place Details", payload);
      }

      return setCachedValue(placeDetailsCache, cacheKey, parseLegacyPlaceMetadata(payload.result ?? {}));
    }

    const response = await fetchWithTimeout(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          "X-Goog-Api-Key": serverEnv.GOOGLE_MAPS_API_KEY ?? "",
          "X-Goog-FieldMask":
            "id,displayName,formattedAddress,location,types,websiteUri,nationalPhoneNumber,currentOpeningHours,addressComponents"
        },
        cache: "no-store"
      },
      GOOGLE_FETCH_TIMEOUT_MS
    );

    if (!response.ok) {
      const error = await buildPlacesApiError("Google Place Details", response);
      if (response.status === 403) {
        disablePlacesApiTemporarily();
      }
      throw error;
    }

    const payload = (await response.json()) as {
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
      types?: string[];
      websiteUri?: string;
      nationalPhoneNumber?: string;
      currentOpeningHours?: { openNow?: boolean };
      addressComponents?: Array<{
        longText?: string;
        shortText?: string;
        types?: string[];
      }>;
    };

    return setCachedValue(placeDetailsCache, cacheKey, parseNewPlaceMetadata(payload));
  } catch (error) {
    logPlacesApiFailure("Google Place Details", error, { placeId });
    return setCachedValue(placeDetailsCache, cacheKey, null);
  }
}

export async function searchPlaceMetadataByText(input: {
  query: string;
  latitude?: number;
  longitude?: number;
}) {
  const cacheKey = `${input.query.toLowerCase()}::${input.latitude ?? ""}::${input.longitude ?? ""}`;
  const cached = getCachedValue(placeTextMatchCache, cacheKey);
  if (cached !== null) {
    return cached;
  }

  const matches = await searchPlaceMatches({
    query: input.query,
    latitude: input.latitude,
    longitude: input.longitude,
    maxResultCount: 3
  });
  const first = matches[0];
  if (!first?.placeId) {
    return setCachedValue(placeTextMatchCache, cacheKey, null);
  }

  const place = await getPlaceDetails({ placeId: first.placeId });
  return setCachedValue(placeTextMatchCache, cacheKey, place);
}

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
    return setCachedValue(geocodeCache, cacheKey, getFallbackLocation(input));
  }

  if (input.placeId) {
    const place = await getPlaceDetails({ placeId: input.placeId });
    if (place) {
      return setCachedValue(
        geocodeCache,
        cacheKey,
        buildResolvedLocationFromPlaceMetadata(place, { label: input.label })
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

  return setCachedValue(geocodeCache, cacheKey, resolved);
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

      const response = await fetchWithTimeout(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`,
        { cache: "no-store" },
        GOOGLE_FETCH_TIMEOUT_MS
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

    const response = await fetchWithTimeout(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
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
      },
      GOOGLE_FETCH_TIMEOUT_MS
    );

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
    .flatMap((result) => (result.success ? [result.data] : []));

  return setCachedValue(placeSearchCache, cacheKey, services);
}
