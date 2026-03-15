"use client";

import { useState } from "react";
import type { LocationContext, RoadmapView } from "@/lib/types";
import { useAppStore } from "@/store/app-store";
import { requestRoadmap } from "@/features/roadmap/api/roadmap-api";
import { RoadmapGate } from "@/features/roadmap/components/roadmap-gate";
import { RoadmapIntake } from "@/features/roadmap/components/roadmap-intake";
import { RoadmapResults } from "@/features/roadmap/components/roadmap-results";
import { useRoadmapServices } from "@/features/roadmap/hooks/use-roadmap-services";

function parseNeedsInput(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function RoadmapClient({ initialLocation }: { initialLocation: LocationContext }) {
  const user = useAppStore((state) => state.user);
  const { services, loading: servicesLoading, error: servicesError } = useRoadmapServices(
    initialLocation,
    Boolean(user)
  );
  const [needsInput, setNeedsInput] = useState("Replace ID\nFind more stable housing support");
  const [needs, setNeeds] = useState<string[]>(() =>
    parseNeedsInput("Replace ID\nFind more stable housing support")
  );
  const [response, setResponse] = useState<RoadmapView | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  function handleNeedsInputChange(value: string) {
    setNeedsInput(value);
    setNeeds(parseNeedsInput(value));
  }

  function handleAddNeed(need: string) {
    if (needs.includes(need)) {
      return;
    }

    const nextValue = needsInput.trimEnd() ? `${needsInput.trimEnd()}\n${need}` : need;
    setNeedsInput(nextValue);
    setNeeds(parseNeedsInput(nextValue));
  }

  async function handleGeneratePlan() {
    setLoading(true);
    setRequestError(null);

    try {
      const payload = await requestRoadmap({
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
    <div className="mx-auto max-w-5xl px-4 py-8 md:h-[calc(100vh-9rem)] md:px-6 md:py-0">
      <div className="grid gap-6 md:h-full md:min-h-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <RoadmapIntake
          needs={needs}
          needsInput={needsInput}
          loading={loading}
          onNeedsInputChange={handleNeedsInputChange}
          onAddNeed={handleAddNeed}
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
