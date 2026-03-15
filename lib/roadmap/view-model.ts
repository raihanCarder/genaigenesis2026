import type {
  RoadmapResponse,
  RoadmapSectionKey,
  RoadmapView,
  ServiceWithMeta
} from "@/lib/types";

const roadmapSectionDefinitions = [
  { key: "thisWeek", label: "This week", summaryKey: "thisWeek_summary" },
  { key: "thisMonth", label: "This month", summaryKey: "thisMonth_summary" },
  { key: "longerTerm", label: "Longer term", summaryKey: "longerTerm_summary" }
] as const satisfies Array<{
  key: RoadmapSectionKey;
  label: string;
  summaryKey: "thisWeek_summary" | "thisMonth_summary" | "longerTerm_summary";
}>;

export function buildRoadmapView(
  response: RoadmapResponse,
  services: ServiceWithMeta[]
): RoadmapView {
  const servicesById = new Map(services.map((service) => [service.id, service]));

  return {
    situationSummary: response.situationSummary,
    sections: roadmapSectionDefinitions.map((section) => ({
      key: section.key,
      label: section.label,
      summary: response[section.summaryKey],
      steps: response[section.key].map((step, index) => ({
        id: `${section.key}-${step.serviceId ?? "step"}-${index}`,
        reason: step.reason,
        serviceId: step.serviceId,
        service: step.serviceId ? servicesById.get(step.serviceId) ?? null : null
      }))
    })),
    notes: response.notes,
    verificationWarnings: response.verificationWarnings
  };
}
