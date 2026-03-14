import { TORONTO_CENTER } from "@/lib/adapters/google-maps";
import { SavedClient } from "@/components/saved-client";

function getLocationFromSearchParams(searchParams: Record<string, string | string[] | undefined>) {
  const lat = Number(searchParams.lat);
  const lng = Number(searchParams.lng);
  const label = typeof searchParams.label === "string" ? searchParams.label : TORONTO_CENTER.label;
  return Number.isFinite(lat) && Number.isFinite(lng)
    ? { latitude: lat, longitude: lng, label }
    : TORONTO_CENTER;
}

export default async function SavedPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const location = getLocationFromSearchParams(resolvedSearchParams);
  return <SavedClient initialLocation={location} />;
}

