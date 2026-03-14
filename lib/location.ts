import { TORONTO_CENTER } from "@/lib/adapters/google-maps";
import { ServiceCategorySchema, type LocationContext, type ServiceCategory } from "@/lib/types";

type SearchParamsRecord = Record<string, string | string[] | undefined>;

function getSingleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export function getLocationFromSearchParams(searchParams: SearchParamsRecord): LocationContext {
  const lat = Number(getSingleValue(searchParams.lat));
  const lng = Number(getSingleValue(searchParams.lng));
  const label = getSingleValue(searchParams.label) ?? TORONTO_CENTER.label;

  return Number.isFinite(lat) && Number.isFinite(lng)
    ? { latitude: lat, longitude: lng, label }
    : TORONTO_CENTER;
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

  if (extras?.category) {
    params.set("category", extras.category);
  }

  return params.toString();
}
