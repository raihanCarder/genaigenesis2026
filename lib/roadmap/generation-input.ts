import type { RoadmapRequestPayload, ServiceWithMeta } from "@/lib/types";
import { formatCategoryLabel, formatDistance } from "@/lib/utils";

function formatConstraintValue(value: string | number | boolean | null) {
  return value === null ? "not provided" : String(value);
}

function buildLocationLine(payload: RoadmapRequestPayload) {
  const parts = [
    payload.location.label,
    payload.location.city,
    payload.location.region,
    payload.location.country
  ].filter(Boolean);

  return parts.length > 0
    ? parts.join(", ")
    : `${payload.location.latitude}, ${payload.location.longitude}`;
}

function buildServiceContextLine(service: ServiceWithMeta) {
  const details = [
    `id=${service.id}`,
    `name=${service.name}`,
    `category=${formatCategoryLabel(service.category)}`,
    `address=${service.address}`,
    `distance=${formatDistance(service.distanceMeters)}`,
    service.description ? `description=${service.description}` : null,
    service.hoursText ? `hours=${service.hoursText}` : null,
    service.eligibilityNotes ? `eligibility=${service.eligibilityNotes}` : null,
    service.phone ? `phone=${service.phone}` : null,
    service.website ? `website=${service.website}` : null
  ].filter(Boolean);

  return `- ${details.join(" | ")}`;
}

export function buildRoadmapGenerationInput(payload: RoadmapRequestPayload) {
  const constraints = Object.entries(payload.constraints ?? {}).filter(
    ([, value]) => value !== undefined
  );
  const services = payload.services.slice(0, 12);

  return [
    "Client planning request:",
    `Location: ${buildLocationLine(payload)}`,
    `Coordinates: ${payload.location.latitude}, ${payload.location.longitude}`,
    "Priority needs:",
    ...payload.needs.map((need) => `- ${need}`),
    "Known constraints:",
    ...(constraints.length > 0
      ? constraints.map(([key, value]) => `- ${key}: ${formatConstraintValue(value)}`)
      : ["- none provided"]),
    "Nearby services already identified for this client:",
    ...(services.length > 0 ? services.map(buildServiceContextLine) : ["- none provided"])
  ].join("\n");
}
