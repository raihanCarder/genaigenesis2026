import { fetchJson } from "@/lib/api/fetch-json";
import { ServiceWithMetaSchema, type LocationContext, type ServiceWithMeta } from "@/lib/types";

const DashboardServicesResponseSchema = ServiceWithMetaSchema.array();

export async function fetchDashboardServices(location: LocationContext): Promise<ServiceWithMeta[]> {
  const params = new URLSearchParams({
    lat: location.latitude.toString(),
    lng: location.longitude.toString(),
    radius: "6000"
  });

  const payload = await fetchJson<unknown>(`/api/services?${params.toString()}`);
  return DashboardServicesResponseSchema.parse(payload);
}

