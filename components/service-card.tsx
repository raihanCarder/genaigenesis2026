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
  locationParams,
}: {
  service: ServiceWithMeta;
  locationParams?: string;
}) {
  return (
    <article className="surface-card flex h-[26rem] min-w-0 flex-col overflow-hidden rounded-4xl p-5 shadow-card">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            {formatCategoryLabel(service.category)}
          </p>
          <h3 className="text-clamp-2 mt-2 break-words text-xl font-semibold text-white">
            {service.name}
          </h3>
          <p className="text-clamp-2 mt-3 min-h-[3rem] break-words text-sm text-white/65">
            {service.description ?? service.address}
          </p>
        </div>
        <div className="shrink-0">
          <FavoriteButton service={service} compact />
        </div>
      </div>
      <div className="mt-4 flex min-w-0 flex-wrap gap-2 text-xs">
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
      <div className="mt-4 grid min-h-[4.75rem] gap-2 overflow-hidden text-sm text-white/60">
        <p className="text-clamp-2 break-words">{service.address}</p>
        {service.hoursText ? (
          <p className="text-clamp-2 break-words">{service.hoursText}</p>
        ) : null}
        {service.phone ? <p className="text-clamp-2 break-words">{service.phone}</p> : null}
      </div>
      <div className="mt-auto flex flex-wrap gap-3 pt-5">
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
