import { RoadmapClient } from "@/features/roadmap/components/roadmap-client";
import { getLocationFromSearchParams } from "@/lib/location";

export default async function PlanPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const location = getLocationFromSearchParams(resolvedSearchParams);
  return <RoadmapClient initialLocation={location} />;
}
