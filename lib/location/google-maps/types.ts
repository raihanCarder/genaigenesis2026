import type { LocationContext } from "@/lib/types";

export type ResolvedLocation = LocationContext & {
  normalizedLocation: string;
};

export type AddressComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};

export type LegacyGeocodeResult = {
  formatted_address?: string;
  place_id?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  address_components?: AddressComponent[];
};

export type PlaceTextMatch = {
  placeId?: string;
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  phone?: string;
  openNow?: boolean;
};
