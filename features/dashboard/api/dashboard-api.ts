import { fetchJson } from "@/lib/api/fetch-json";
import {
  clearCachedDashboardPayload,
  getCachedDashboardPayload,
  setCachedDashboardPayload
} from "@/lib/location/dashboard-cache";
import { buildLocationSearchParams } from "@/lib/location";
import {
  DashboardPayloadSchema,
  type DashboardPayload,
  type LocationContext,
  type ServiceWithMeta
} from "@/lib/types";

export async function fetchDashboardPayload(
  location: LocationContext,
  options?: {
    preferCache?: boolean;
    radius?: number;
  }
): Promise<DashboardPayload> {
  const radius = options?.radius ?? 6000;
  const preferCache = options?.preferCache ?? true;

  if (preferCache) {
    const cached = getCachedDashboardPayload(location, radius);
    if (cached) {
      return cached;
    }
  }

  const params = new URLSearchParams(buildLocationSearchParams(location));
  params.set("radius", String(radius));
  const payload = await fetchJson<unknown>(`/api/dashboard?${params.toString()}`);
  const parsed = DashboardPayloadSchema.parse(payload);
  setCachedDashboardPayload(location, parsed, radius);
  return parsed;
}

export async function fetchDashboardServices(location: LocationContext): Promise<ServiceWithMeta[]> {
  const payload = await fetchDashboardPayload(location);
  return payload.services;
}

export { clearCachedDashboardPayload, getCachedDashboardPayload };
