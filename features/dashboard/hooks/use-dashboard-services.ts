"use client";

import { useEffect, useState } from "react";
import { fetchDashboardPayload } from "@/features/dashboard/api/dashboard-api";
import type { DashboardPayload, LocationContext } from "@/lib/types";

export function useDashboardServices(location: LocationContext) {
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchDashboardPayload(location);
        if (!cancelled) {
          setPayload(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : "Unable to load services.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadServices();

    return () => {
      cancelled = true;
    };
  }, [location.latitude, location.longitude, location.label]);

  return {
    payload,
    services: payload?.services ?? [],
    location: payload?.location ?? location,
    anchorPlace: payload?.anchorPlace ?? null,
    warnings: payload?.warnings ?? [],
    loading,
    error
  };
}
