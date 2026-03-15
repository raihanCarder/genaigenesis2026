import { fetchDashboardPayload } from "@/features/dashboard/api/dashboard-api";
import { fetchJson } from "@/lib/api/fetch-json";
import {
  RoadmapViewSchema,
  type LocationContext,
  type RoadmapView,
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
}): Promise<RoadmapView> {
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
      location: input.location,
      services: input.services.slice(0, 12)
    })
  });

  return RoadmapViewSchema.parse(payload);
}
