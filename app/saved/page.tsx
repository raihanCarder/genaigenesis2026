import { SavedClient } from "@/features/saved/components/saved-client";
import { getLocationFromSearchParams } from "@/lib/location";

export default async function SavedPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const location = getLocationFromSearchParams(resolvedSearchParams);
  return <SavedClient initialLocation={location} />;
}
