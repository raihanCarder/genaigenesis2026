import { DashboardClient } from "@/features/dashboard/components/dashboard-client";
import { getLocationFromSearchParams } from "@/lib/location";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const location = getLocationFromSearchParams(resolvedSearchParams);
  return <DashboardClient initialLocation={location} />;
}
