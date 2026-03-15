import { fetchDashboardPayload } from "@/features/dashboard/api/dashboard-api";
import { fetchJson } from "@/lib/api/fetch-json";
import {
  RoadmapResponseSchema,
  type LocationContext,
  type RoadmapResponse,
  type ServiceWithMeta
} from "@/lib/types";

export async function fetchRoadmapServices(location: LocationContext): Promise<ServiceWithMeta[]> {
  const payload = await fetchDashboardPayload(location);
  return payload.services;
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
        city: input.location.city ?? input.location.label,
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
