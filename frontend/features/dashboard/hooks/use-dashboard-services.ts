"use client";

import { useEffect, useState } from "react";
import { fetchDashboardServices } from "@/features/dashboard/api/dashboard-api";
import type { LocationContext, ServiceWithMeta } from "@/lib/types";

export function useDashboardServices(location: LocationContext) {
  const [services, setServices] = useState<ServiceWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchDashboardServices(location);
        if (!cancelled) {
          setServices(payload);
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
    services,
    loading,
    error
  };
}

