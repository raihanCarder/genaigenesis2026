"use client";

import { useState } from "react";
import { getFirebaseClientAuth } from "@/lib/adapters/firebase-client";
import type { LocationContext, RoadmapResponse } from "@/lib/types";
import { useAppStore } from "@/store/app-store";
import { requestRoadmap } from "@/features/roadmap/api/roadmap-api";
import { RoadmapGate } from "@/features/roadmap/components/roadmap-gate";
import { RoadmapIntake } from "@/features/roadmap/components/roadmap-intake";
import { RoadmapResults } from "@/features/roadmap/components/roadmap-results";
import { useRoadmapServices } from "@/features/roadmap/hooks/use-roadmap-services";

export function RoadmapClient({ initialLocation }: { initialLocation: LocationContext }) {
  const user = useAppStore((state) => state.user);
  const { services, loading: servicesLoading, error: servicesError } = useRoadmapServices(
    initialLocation,
    Boolean(user)
  );
  const [needs, setNeeds] = useState<string[]>(["Replace ID", "Find more stable housing support"]);
  const [response, setResponse] = useState<RoadmapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  async function handleGeneratePlan() {
    const token = await getFirebaseClientAuth()?.currentUser?.getIdToken();
    if (!token) {
      setRequestError("You need to sign in before generating a roadmap.");
      return;
    }

    setLoading(true);
    setRequestError(null);

    try {
      const payload = await requestRoadmap({
        token,
        needs,
        location: initialLocation,
        services
      });
      setResponse(payload);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Unable to generate roadmap.");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return <RoadmapGate />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <div className="grid gap-6 md:grid-cols-[1fr,1.1fr]">
        <RoadmapIntake
          needs={needs}
          loading={loading}
          onNeedsChange={setNeeds}
          onGenerate={() => void handleGeneratePlan()}
        />
        <RoadmapResults
          location={initialLocation}
          response={response}
          servicesLoading={servicesLoading}
          servicesError={servicesError}
          requestError={requestError}
        />
      </div>
    </div>
  );
}
