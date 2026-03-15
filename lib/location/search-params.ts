import { DEFAULT_LOCATION } from "@/lib/location/defaults";
import { ServiceCategorySchema, type LocationContext, type ServiceCategory } from "@/lib/types";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function getSingleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function getLocationFromSearchParams(searchParams: SearchParamsRecord): LocationContext {
  const lat = Number(getSingleValue(searchParams.lat));
  const lng = Number(getSingleValue(searchParams.lng));
  const label = getSingleValue(searchParams.label) ?? DEFAULT_LOCATION.label;
  const placeId = getSingleValue(searchParams.placeId);
  const city = getSingleValue(searchParams.city);
  const region = getSingleValue(searchParams.region);
  const country = getSingleValue(searchParams.country);

  return Number.isFinite(lat) && Number.isFinite(lng)
    ? {
        latitude: lat,
        longitude: lng,
        label,
        placeId,
        city,
        region,
        country
      }
    : DEFAULT_LOCATION;
}

export function getCategoryFromSearchParams(searchParams: SearchParamsRecord) {
  const category = getSingleValue(searchParams.category);
  const parsed = category ? ServiceCategorySchema.safeParse(category) : null;
  return parsed?.success ? parsed.data : undefined;
}

export function buildLocationSearchParams(
  location: LocationContext,
  extras?: {
    category?: ServiceCategory;
  }
) {
  const params = new URLSearchParams({
    lat: location.latitude.toString(),
    lng: location.longitude.toString(),
    label: location.label
  });

  if (location.placeId) {
    params.set("placeId", location.placeId);
  }
  if (location.city) {
    params.set("city", location.city);
  }
  if (location.region) {
    params.set("region", location.region);
  }
  if (location.country) {
    params.set("country", location.country);
  }

  if (extras?.category) {
    params.set("category", extras.category);
  }

  return params.toString();
}
