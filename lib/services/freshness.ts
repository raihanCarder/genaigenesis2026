import type { FreshnessState, Service } from "@/lib/types";

const FRESHNESS_WINDOWS_DAYS: Partial<Record<Service["category"], number>> = {
  shelters: 7,
  "free-food-events": 7,
  food: 14,
  showers: 14,
  clinics: 30,
  services: 30,
  "legal-help": 30,
  bathrooms: 30,
  "wifi-charging": 30
};

export function getFreshnessState(service: Service, now = new Date()): FreshnessState {
  if (!service.lastVerifiedAt) {
    return "unknown";
  }
  const verifiedAt = new Date(service.lastVerifiedAt);
  if (Number.isNaN(verifiedAt.getTime())) {
    return "unknown";
  }
  const windowDays = FRESHNESS_WINDOWS_DAYS[service.category] ?? 30;
  const ageMs = now.getTime() - verifiedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays <= windowDays ? "fresh" : "stale";
}

