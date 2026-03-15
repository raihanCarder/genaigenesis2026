import { DEFAULT_LOCATION } from "@/lib/location/defaults";
import type {
  AddressComponent,
  LegacyGeocodeResult,
  PlaceTextMatch,
  ResolvedLocation
} from "@/lib/location/google-maps/types";
import { ServiceSchema, type LocationPlaceMetadata, type Service, type ServiceCategory } from "@/lib/types";
import { slugify } from "@/lib/utils";

function findAddressComponent(
  components: AddressComponent[] | undefined,
  matcher: (types: string[]) => boolean,
  key: "long_name" | "short_name" = "long_name"
) {
  const component = components?.find((entry) => matcher(entry.types ?? []));
  const value = component?.[key];
  return typeof value === "string" ? value : undefined;
}

export function extractLocationFields(components: AddressComponent[] | undefined) {
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

export function buildResolvedLocation(
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
    latitude: input.latitude ?? result.geometry?.location?.lat ?? DEFAULT_LOCATION.latitude,
    longitude: input.longitude ?? result.geometry?.location?.lng ?? DEFAULT_LOCATION.longitude,
    placeId: result.place_id,
    ...locationFields
  };
}

export function buildResolvedLocationFromPlaceMetadata(
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

export function parseLegacyPlaceMetadata(result: {
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
    latitude: result.geometry?.location?.lat ?? DEFAULT_LOCATION.latitude,
    longitude: result.geometry?.location?.lng ?? DEFAULT_LOCATION.longitude,
    types: result.types ?? [],
    website: result.website,
    phone: result.formatted_phone_number,
    openNow: result.opening_hours?.open_now,
    ...locationFields
  };
}

export function parseNewPlaceMetadata(result: {
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
    latitude: result.location?.latitude ?? DEFAULT_LOCATION.latitude,
    longitude: result.location?.longitude ?? DEFAULT_LOCATION.longitude,
    types: result.types ?? [],
    website: result.websiteUri,
    phone: result.nationalPhoneNumber,
    openNow: result.currentOpeningHours?.openNow,
    ...locationFields
  };
}

export function buildServiceFromPlaceMatch(
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
