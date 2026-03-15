import { hasGoogleMapsEnv, serverEnv } from "@/lib/env";
import {
  CACHE_TTL_MS,
  GOOGLE_FETCH_TIMEOUT_MS
} from "@/lib/location/google-maps/constants";
import { getFallbackSuggestions } from "@/lib/location/google-maps/fallbacks";
import {
  buildLegacyPlacesStatusError,
  buildPlacesApiError,
  logPlacesApiFailure,
  shouldDisablePlacesFromLegacyStatus,
  usesLegacyPlacesApi
} from "@/lib/location/google-maps/http";
import {
  buildResolvedLocationFromPlaceMetadata,
  parseLegacyPlaceMetadata,
  parseNewPlaceMetadata
} from "@/lib/location/google-maps/parsers";
import {
  autocompleteCache,
  disablePlacesApiTemporarily,
  isPlacesApiDisabled,
  placeDetailsCache,
  placeTextMatchCache
} from "@/lib/location/google-maps/state";
import type { LegacyGeocodeResult, PlaceTextMatch } from "@/lib/location/google-maps/types";
import { getCachedValue, setCachedValue } from "@/lib/shared/expiring-cache";
import { fetchWithTimeout } from "@/lib/shared/fetch-with-timeout";

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

export async function searchPlaceMatches(input: {
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
          address_components?: Array<{
            long_name?: string;
            short_name?: string;
            types?: string[];
          }>;
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

      return setCachedValue(
        placeDetailsCache,
        cacheKey,
        parseLegacyPlaceMetadata(payload.result ?? {}),
        CACHE_TTL_MS
      );
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

    return setCachedValue(placeDetailsCache, cacheKey, parseNewPlaceMetadata(payload), CACHE_TTL_MS);
  } catch (error) {
    logPlacesApiFailure("Google Place Details", error, { placeId });
    return setCachedValue(placeDetailsCache, cacheKey, null, CACHE_TTL_MS);
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
    return setCachedValue(placeTextMatchCache, cacheKey, null, CACHE_TTL_MS);
  }

  const place = await getPlaceDetails({ placeId: first.placeId });
  return setCachedValue(placeTextMatchCache, cacheKey, place, CACHE_TTL_MS);
}

export async function autocompleteLocations(input: {
  query: string;
  sessionToken?: string;
}) {
  const query = input.query.trim();
  if (query.length < 2) {
    return [] satisfies import("@/lib/types").LocationSuggestion[];
  }

  const cacheKey = query.toLowerCase();
  const cached = getCachedValue(autocompleteCache, cacheKey);
  if (cached) {
    return cached;
  }

  if (!hasGoogleMapsEnv || isPlacesApiDisabled()) {
    return setCachedValue(autocompleteCache, cacheKey, getFallbackSuggestions(query), CACHE_TTL_MS);
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

      return setCachedValue(autocompleteCache, cacheKey, suggestions, CACHE_TTL_MS);
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

    return setCachedValue(autocompleteCache, cacheKey, suggestions, CACHE_TTL_MS);
  } catch (error) {
    logPlacesApiFailure("Google Places autocomplete", error, { query });
    return setCachedValue(autocompleteCache, cacheKey, getFallbackSuggestions(query), CACHE_TTL_MS);
  }
}

export { fetchGeocodeResult, buildResolvedLocationFromPlaceMetadata };
