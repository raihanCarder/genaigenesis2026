import type { LocationPlaceMetadata, LocationSuggestion, Service } from "@/lib/types";
import type { ResolvedLocation } from "@/lib/location/google-maps/types";
import { PLACES_ERROR_COOLDOWN_MS } from "@/lib/location/google-maps/constants";
import { type CacheEntry } from "@/lib/shared/expiring-cache";

export const geocodeCache = new Map<string, CacheEntry<ResolvedLocation>>();
export const autocompleteCache = new Map<string, CacheEntry<LocationSuggestion[]>>();
export const placeDetailsCache = new Map<string, CacheEntry<LocationPlaceMetadata | null>>();
export const placeSearchCache = new Map<string, CacheEntry<Service[]>>();
export const placeTextMatchCache = new Map<string, CacheEntry<LocationPlaceMetadata | null>>();

const placesApiState = {
  disabledUntil: 0
};

export function isPlacesApiDisabled() {
  return Date.now() < placesApiState.disabledUntil;
}

export function disablePlacesApiTemporarily() {
  placesApiState.disabledUntil = Date.now() + PLACES_ERROR_COOLDOWN_MS;
}
