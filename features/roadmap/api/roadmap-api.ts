import { fetchJson } from "@/lib/api/fetch-json";
import {
  RoadmapResponseSchema,
  ServiceWithMetaSchema,
  type LocationContext,
  type RoadmapResponse,
  type ServiceWithMeta
} from "@/lib/types";

const RoadmapServicesResponseSchema = ServiceWithMetaSchema.array();

export async function fetchRoadmapServices(location: LocationContext): Promise<ServiceWithMeta[]> {
  const params = new URLSearchParams({
    lat: location.latitude.toString(),
    lng: location.longitude.toString(),
    radius: "6000"
  });

  const payload = await fetchJson<unknown>(`/api/services?${params.toString()}`);
  return RoadmapServicesResponseSchema.parse(payload);
}

export async function requestRoadmap(input: {
  needs: string[];
  location: LocationContext;
  services: ServiceWithMeta[];
}): Promise<RoadmapResponse> {
  const payload = await fetchJson<unknown>("/api/roadmap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      needs: input.needs,
      constraints: {
        city: "Toronto",
        wantsLongTermStability: true
      },
      location: {
        latitude: input.location.latitude,
        longitude: input.location.longitude
      },
      services: input.services.slice(0, 12)
    })
  });

  return RoadmapResponseSchema.parse(payload);
}
