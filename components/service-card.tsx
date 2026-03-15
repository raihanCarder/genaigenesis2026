import {
  Bath,
  CalendarDays,
  HandHeart,
  House,
  Scale,
  ShowerHead,
  Stethoscope,
  UtensilsCrossed,
  Wifi,
  type LucideIcon
} from "lucide-react";
import { buildDirectionsUrl } from "@/lib/adapters/google-maps";
import { formatCategoryLabel, formatDistance } from "@/lib/utils";
import type { ServiceCategory, ServiceWithMeta } from "@/lib/types";
import { FavoriteButton } from "@/components/favorite-button";
import { ServiceDetailsButton } from "@/components/service-details-button";

const categoryIconMap: Record<ServiceCategory, LucideIcon> = {
  food: UtensilsCrossed,
  services: HandHeart,
  "free-food-events": CalendarDays,
  showers: ShowerHead,
  bathrooms: Bath,
  shelters: House,
  clinics: Stethoscope,
  "legal-help": Scale,
  "wifi-charging": Wifi
};

function freshnessCopy(state?: ServiceWithMeta["freshnessState"]) {
  if (state === "fresh") {
    return "Freshly verified";
  }
  if (state === "stale") {
    return "Verify before traveling";
  }
  return "Last verified: recently";
}

export function ServiceCard({
  service,
  locationParams,
  recommendedByBeacon = false,
}: {
  service: ServiceWithMeta;
  locationParams?: string;
  recommendedByBeacon?: boolean;
}) {
  const CategoryIcon = categoryIconMap[service.category];
  const detailsHref = `/services/${service.id}${locationParams ? `?${locationParams}` : ""}`;

  return (
    <article className="surface-card flex h-[26rem] min-w-0 flex-col overflow-hidden rounded-4xl p-5 shadow-card">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {formatCategoryLabel(service.category)}
          </p>
          <h3 className="mt-2 break-words text-xl font-semibold leading-tight text-white">
            {service.name}
          </h3>
          <p className="mt-3 break-words text-sm leading-6 text-white/65">
            {service.description ?? service.address}
          </p>
        </div>
        <div className="shrink-0">
          <FavoriteButton service={service} compact />
        </div>
      </div>
      <div className="mt-4 flex min-w-0 flex-wrap gap-2 text-xs">
        {recommendedByBeacon ? (
          <span className="rounded-full border border-accent/35 bg-accent/10 px-3 py-1.5 font-medium text-accentDark">
            Recommended by Beacon
          </span>
        ) : null}
        <span className="rounded-full bg-accent/10 px-3 py-1.5 font-medium text-accentDark">
          {formatDistance(service.distanceMeters)}
        </span>
        <span className="rounded-full bg-slate/10 px-3 py-1.5 font-medium text-slate">
          {freshnessCopy(service.freshnessState)}
        </span>
        {service.sourceName ? (
          <span
            className="surface-subtle max-w-full truncate rounded-full px-3 py-1.5 text-white/55"
            title={service.sourceName}
          >
            Source: {service.sourceName}
          </span>
        ) : null}
      </div>
      <div className="mt-4 grid gap-2 text-sm text-white/60">
        {service.hoursText ? (
          <p className="break-words leading-6">{service.hoursText}</p>
        ) : null}
        {service.phone ? (
          <p className="break-words leading-6">{service.phone}</p>
        ) : null}
      </div>
      <div className="mt-auto pt-5">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <ServiceDetailsButton href={detailsHref} />
            <a
              href={buildDirectionsUrl(service)}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary rounded-full px-4 py-2 text-sm font-medium"
            >
              Directions
            </a>
          </div>
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white/56"
            aria-hidden="true"
            title={formatCategoryLabel(service.category)}
          >
            <CategoryIcon className="h-4.5 w-4.5" strokeWidth={1.85} />
          </div>
        </div>
      </div>
    </article>
  );
}
