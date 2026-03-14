import { hasGoogleMapsEnv, serverEnv } from "@/lib/env";
import { logError } from "@/lib/logger";
import { ServiceSchema, type Service, type ServiceCategory } from "@/lib/types";
import { slugify } from "@/lib/utils";

export const TORONTO_CENTER = {
  latitude: 43.6532,
  longitude: -79.3832,
  label: "Downtown Toronto"
};

const fallbackLocations: Record<
  string,
  { normalizedLocation: string; latitude: number; longitude: number }
> = {
  toronto: {
    normalizedLocation: "Toronto, ON, Canada",
    latitude: TORONTO_CENTER.latitude,
    longitude: TORONTO_CENTER.longitude
  },
  "downtown toronto": {
    normalizedLocation: "Downtown Toronto, Toronto, ON, Canada",
    latitude: TORONTO_CENTER.latitude,
    longitude: TORONTO_CENTER.longitude
  },
  "yonge and dundas": {
    normalizedLocation: "Yonge-Dundas Square, Toronto, ON, Canada",
    latitude: 43.6561,
    longitude: -79.3802
  }
};

const placeQueries: Partial<Record<ServiceCategory, string>> = {
  clinics: "community health centre",
  bathrooms: "public washroom",
  "wifi-charging": "public library charging wifi",
  services: "community support centre"
};

export async function geocodeLocation(location: string) {
  const normalizedInput = location.trim().toLowerCase();
  if (!location.trim()) {
    throw new Error("Location is required.");
  }
  if (!hasGoogleMapsEnv) {
    const fallback = fallbackLocations[normalizedInput] ?? fallbackLocations.toronto;
    return fallback;
  }
  const params = new URLSearchParams({
    address: location,
    key: serverEnv.GOOGLE_MAPS_API_KEY ?? ""
  });
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
    { cache: "no-store" }
  );
  const payload = (await response.json()) as {
    results?: Array<{
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
    }>;
    status?: string;
  };
  const result = payload.results?.[0];
  if (!result) {
    throw new Error(`Unable to geocode location. Status: ${payload.status ?? "unknown"}`);
  }
  return {
    normalizedLocation: result.formatted_address,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng
  };
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
  if (!hasGoogleMapsEnv || !query) {
    return [] satisfies Service[];
  }

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": serverEnv.GOOGLE_MAPS_API_KEY ?? "",
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.currentOpeningHours,places.websiteUri"
      },
      body: JSON.stringify({
        textQuery: `${query} near Toronto`,
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
      throw new Error(`Places search failed with ${response.status}`);
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
          address: place.formattedAddress ?? "Toronto, ON",
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
    logError("Google Places search failed", error, { category: input.category });
    return [];
  }
}

