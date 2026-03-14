import type { ServiceWithMeta } from "@/lib/types";

export function scoreService(service: ServiceWithMeta, openNowPreference?: boolean) {
  let score = 0;
  if (openNowPreference && service.openNow) {
    score += 25;
  }
  if (typeof service.distanceMeters === "number") {
    score += Math.max(0, 25 - service.distanceMeters / 400);
  }
  if (service.freshnessState === "fresh") {
    score += 15;
  }
  if (service.freshnessState === "unknown") {
    score += 5;
  }
  score += (service.confidenceScore ?? 0.5) * 50;
  return score;
}

export function rankServices(services: ServiceWithMeta[], openNowPreference?: boolean) {
  return [...services].sort(
    (left, right) => scoreService(right, openNowPreference) - scoreService(left, openNowPreference)
  );
}

