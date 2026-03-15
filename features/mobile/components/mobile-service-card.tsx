"use client";

import { Clock3, MapPinned, Phone } from "lucide-react";
import { FavoriteButton } from "@/components/favorite-button";
import { ServiceDetailsButton } from "@/components/service-details-button";
import type { ServiceWithMeta } from "@/lib/types";
import { cn, formatCategoryLabel, formatDistance } from "@/lib/utils";

function buildDirectionsUrl(service: Pick<ServiceWithMeta, "latitude" | "longitude">) {
  const params = new URLSearchParams({
    api: "1",
    destination: `${service.latitude},${service.longitude}`
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function freshnessCopy(state?: ServiceWithMeta["freshnessState"]) {
  if (state === "fresh") {
    return "Fresh";
  }
  if (state === "stale") {
    return "Verify";
  }
  return "Recent";
}

export function MobileServiceCard({
  service,
  locationParams,
  note,
  preferDirections = false
}: {
  service: ServiceWithMeta;
  locationParams: string;
  note?: string;
  preferDirections?: boolean;
}) {
  const detailsHref = `/services/${service.id}?${locationParams}`;
  const directionsHref = buildDirectionsUrl(service);
  const summary = service.description ?? service.address;

  return (
    <article className="rounded-[1.65rem] border border-black/8 bg-white p-4 text-black shadow-[0_16px_34px_rgba(0,0,0,0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#f2ede6] px-3 py-1 text-[11px] font-medium text-black/62">
              {formatCategoryLabel(service.category)}
            </span>
            <span className="rounded-full bg-[#f6f3ee] px-3 py-1 text-[11px] font-medium text-black/56">
              {formatDistance(service.distanceMeters)}
            </span>
            {service.openNow ? (
              <span className="rounded-full bg-[#e8ffef] px-3 py-1 text-[11px] font-medium text-[#24673a]">
                Open
              </span>
            ) : null}
            {!service.openNow ? (
              <span className="rounded-full bg-[#f6f3ee] px-3 py-1 text-[11px] font-medium text-black/56">
                {freshnessCopy(service.freshnessState)}
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 text-[1.05rem] font-semibold leading-tight text-black">
            {service.name}
          </h3>
        </div>
        <div className="shrink-0">
          <FavoriteButton service={service} compact />
        </div>
      </div>

      {summary ? (
        <p className="text-clamp-3 mt-3 text-sm leading-6 text-black/64">{summary}</p>
      ) : null}

      {note ? (
        <div className="mt-3 rounded-[1.1rem] bg-[#fff4e4] px-3 py-2 text-sm leading-5 text-[#6a4017]">
          {note}
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 text-sm text-black/56">
        <div className="flex items-start gap-2">
          <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-black/28" />
          <p className="text-clamp-2 leading-5">{service.address}</p>
        </div>
        {service.hoursText ? (
          <div className="flex items-start gap-2">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-black/28" />
            <p className="text-clamp-2 leading-5">{service.hoursText}</p>
          </div>
        ) : null}
        {service.phone ? (
          <div className="flex items-start gap-2">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-black/28" />
            <p className="leading-5">{service.phone}</p>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "mt-4 grid gap-2",
          preferDirections ? "grid-cols-[1.15fr_0.85fr]" : "grid-cols-2"
        )}
      >
        {preferDirections ? (
          <>
            <a
              href={directionsHref}
              target="_blank"
              rel="noreferrer"
              className="btn-primary inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium"
            >
              Directions
            </a>
            <ServiceDetailsButton href={detailsHref} className="w-full min-w-0" />
          </>
        ) : (
          <>
            <ServiceDetailsButton href={detailsHref} className="w-full min-w-0" />
            <a
              href={directionsHref}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-medium"
            >
              Directions
            </a>
          </>
        )}
      </div>
    </article>
  );
}
