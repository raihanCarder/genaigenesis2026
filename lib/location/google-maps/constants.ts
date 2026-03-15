import { DEFAULT_LOCATION } from "@/lib/location/defaults";
import type { ResolvedLocation } from "@/lib/location/google-maps/types";
import type { ServiceCategory } from "@/lib/types";

export const CACHE_TTL_MS = 5 * 60 * 1000;
export const PLACES_ERROR_COOLDOWN_MS = 15 * 60 * 1000;
export const GOOGLE_FETCH_TIMEOUT_MS = 4000;

export const fallbackLocations: Record<string, ResolvedLocation> = {
  toronto: {
    normalizedLocation: "Toronto, ON, Canada",
    label: "Toronto, ON, Canada",
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
    city: "Toronto",
    region: "ON",
    country: "Canada"
  },
  "downtown toronto": {
    normalizedLocation: "Downtown Toronto, Toronto, ON, Canada",
    label: "Downtown Toronto, Toronto, ON, Canada",
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
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

export const placeQueries: Partial<Record<ServiceCategory, string>> = {
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
