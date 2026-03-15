import { fetchJson } from "@/lib/api/fetch-json";
import { buildLocationSearchParams } from "@/lib/location";
import {
  DashboardPayloadSchema,
  type DashboardPayload,
  type LocationContext,
  type ServiceWithMeta
} from "@/lib/types";

export async function fetchDashboardPayload(location: LocationContext): Promise<DashboardPayload> {
  const params = new URLSearchParams(buildLocationSearchParams(location));
  params.set("radius", "6000");
  const payload = await fetchJson<unknown>(`/api/dashboard?${params.toString()}`);
  return DashboardPayloadSchema.parse(payload);
}

export async function fetchDashboardServices(location: LocationContext): Promise<ServiceWithMeta[]> {
  const payload = await fetchDashboardPayload(location);
  return payload.services;
}
