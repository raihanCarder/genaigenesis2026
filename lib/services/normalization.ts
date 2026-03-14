import curatedSeed from "@/data/toronto/services.json";
import { ServiceSchema, type Service, type ServiceWithMeta } from "@/lib/types";
import { getFreshnessState } from "@/lib/services/freshness";

export function getCuratedServices(): Service[] {
  return curatedSeed.map((record) =>
    ServiceSchema.parse({
      ...record,
      freshnessState: getFreshnessState(record as Service)
    })
  );
}

export function withDistance(service: Service, distanceMeters?: number): ServiceWithMeta {
  return {
    ...service,
    distanceMeters
  };
}

