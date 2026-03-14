import Link from "next/link";
import { buildDirectionsUrl } from "@/lib/adapters/google-maps";
import { formatCategoryLabel, formatDistance } from "@/lib/utils";
import type { ServiceWithMeta } from "@/lib/types";
import { FavoriteButton } from "@/components/favorite-button";

function freshnessCopy(state?: ServiceWithMeta["freshnessState"]) {
  if (state === "fresh") {
    return "Freshly verified";
  }
  if (state === "stale") {
    return "Verify before traveling";
  }
  return "Freshness unknown";
}

export function ServiceCard({
  service,
  locationParams
}: {
  service: ServiceWithMeta;
  locationParams?: string;
}) {
  return (
    <article className="surface-card rounded-4xl p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {formatCategoryLabel(service.category)}
          </p>
          <h3 className="mt-2 text-xl font-semibold">{service.name}</h3>
          <p className="mt-3 text-sm text-white/65">{service.description ?? service.address}</p>
        </div>
        <FavoriteButton service={service} compact />
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-accent/10 px-3 py-1.5 font-medium text-accentDark">
          {formatDistance(service.distanceMeters)}
        </span>
        <span className="rounded-full bg-slate/10 px-3 py-1.5 font-medium text-slate">
          {freshnessCopy(service.freshnessState)}
        </span>
        {service.sourceName ? (
          <span className="surface-subtle rounded-full px-3 py-1.5 text-white/55">
            Source: {service.sourceName}
          </span>
        ) : null}
      </div>
      <div className="mt-4 grid gap-2 text-sm text-white/60">
        <p>{service.address}</p>
        {service.hoursText ? <p>{service.hoursText}</p> : null}
        {service.phone ? <p>{service.phone}</p> : null}
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/services/${service.id}${locationParams ? `?${locationParams}` : ""}`}
          className="btn-primary rounded-full px-4 py-2 text-sm font-medium"
        >
          Details
        </Link>
        <a
          href={buildDirectionsUrl(service)}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary rounded-full px-4 py-2 text-sm font-medium"
        >
          Directions
        </a>
      </div>
    </article>
  );
}
