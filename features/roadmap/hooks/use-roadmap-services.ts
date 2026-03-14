"use client";

import { useEffect, useState } from "react";
import { fetchRoadmapServices } from "@/features/roadmap/api/roadmap-api";
import type { LocationContext, ServiceWithMeta } from "@/lib/types";

export function useRoadmapServices(location: LocationContext, enabled: boolean) {
  const [services, setServices] = useState<ServiceWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    async function loadServices() {
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchRoadmapServices(location);
        if (!cancelled) {
          setServices(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : "Unable to load roadmap services.");
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
  }, [enabled, location.latitude, location.longitude, location.label]);

  return {
    services,
    loading,
    error
  };
}

