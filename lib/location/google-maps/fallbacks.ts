import { fallbackLocations } from "@/lib/location/google-maps/constants";
import type { ResolvedLocation } from "@/lib/location/google-maps/types";
import type { LocationSuggestion } from "@/lib/types";

export function getFallbackLocation(input: {
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

export function getFallbackSuggestions(query: string) {
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
