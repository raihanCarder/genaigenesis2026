import {
  geocodeLocation,
  getPlaceDetails,
  searchPlaceMetadataByText
} from "@/lib/adapters/google-maps";
import { sourceNameFromUrl } from "@/lib/discovery/trusted-web/trust";
import type { WebDiscoveryCandidate } from "@/lib/discovery/trusted-web/types";
import { ServiceSchema, type LocationContext } from "@/lib/types";
import { haversineDistanceMeters, slugify } from "@/lib/utils";

export async function validateDiscoveredCandidate(input: {
  candidate: WebDiscoveryCandidate;
  location: LocationContext;
  radiusMeters: number;
  sourceUrl: string;
}) {
  let resolvedPlace = null;
  let resolvedLocation = null;

  if (input.candidate.address) {
    try {
      resolvedLocation = await geocodeLocation({
        location: input.candidate.address,
        label: input.candidate.name
      });
      if (resolvedLocation.placeId) {
        resolvedPlace = await getPlaceDetails({ placeId: resolvedLocation.placeId });
      }
    } catch {
      resolvedLocation = null;
    }
  }

  if (!resolvedPlace) {
    resolvedPlace = await searchPlaceMetadataByText({
      query: `${input.candidate.name} ${input.candidate.address ?? input.location.label}`,
      latitude: input.location.latitude,
      longitude: input.location.longitude
    });
  }

  const latitude = resolvedPlace?.latitude ?? resolvedLocation?.latitude;
  const longitude = resolvedPlace?.longitude ?? resolvedLocation?.longitude;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const resolvedLatitude = Number(latitude);
  const resolvedLongitude = Number(longitude);
  const distanceMeters = haversineDistanceMeters(
    input.location.latitude,
    input.location.longitude,
    resolvedLatitude,
    resolvedLongitude
  );
  if (distanceMeters > input.radiusMeters) {
    return null;
  }

  const result = ServiceSchema.safeParse({
    id: `scraped-${slugify(resolvedPlace?.placeId ?? `${input.candidate.name}-${input.sourceUrl}`)}`,
    name: input.candidate.name,
    category: input.candidate.category,
    description: input.candidate.description,
    address: resolvedPlace?.address ?? resolvedLocation?.label ?? input.candidate.address ?? "Unknown address",
    latitude: resolvedLatitude,
    longitude: resolvedLongitude,
    placeId: resolvedPlace?.placeId ?? resolvedLocation?.placeId,
    phone: input.candidate.phone ?? resolvedPlace?.phone,
    website: input.candidate.website ?? resolvedPlace?.website,
    hoursText: input.candidate.hoursText,
    openNow: resolvedPlace?.openNow,
    eligibilityNotes: input.candidate.eligibilityNotes,
    sourceType: "scraped",
    sourceName: sourceNameFromUrl(input.sourceUrl),
    sourceUrl: input.sourceUrl,
    confidenceScore: resolvedPlace?.placeId ? 0.74 : 0.62,
    freshnessState: "unknown"
  });

  return result.success ? result.data : null;
}
