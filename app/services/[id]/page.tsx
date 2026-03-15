import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CircleAlert,
  Clock3,
  ExternalLink,
  Globe2,
  MapPin,
  Phone,
  ShieldCheck
} from "lucide-react";
import { BackButton } from "@/components/back-button";
import { FavoriteButton } from "@/components/favorite-button";
import { buildDirectionsUrl } from "@/lib/location/google-maps";
import { hasGoogleMapsEnv } from "@/lib/env";
import { buildLocationSearchParams, getLocationFromSearchParams } from "@/lib/location";
import { getServiceById } from "@/lib/services/query";
import { formatCategoryLabel, formatDistance } from "@/lib/utils";

function freshnessCopy(state?: string) {
  if (state === "fresh") {
    return "Freshly verified";
  }
  if (state === "stale") {
    return "Verify before traveling";
  }
  return "Freshness unknown";
}

export default async function ServiceDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const location = getLocationFromSearchParams(resolvedSearchParams);
  const service = await getServiceById({
    id,
    latitude: location.latitude,
    longitude: location.longitude,
    label: location.label,
    placeId: location.placeId,
    city: location.city,
    region: location.region,
    country: location.country
  });

  if (!service) {
    notFound();
  }

  const locationParams = buildLocationSearchParams(location);
  const dashboardHref = `/dashboard?${locationParams}`;
  const categoryLabel = formatCategoryLabel(service.category);
  const staticMapParams = new URLSearchParams({
    lat: service.latitude.toString(),
    lng: service.longitude.toString()
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <section className="glass-panel relative overflow-hidden rounded-4xl p-5 shadow-card md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(242,140,40,0.12),transparent_32%)]" />

        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <BackButton fallbackHref={dashboardHref} />
          <FavoriteButton service={service} />
        </div>

        <div className="relative mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.92fr)] lg:items-start">
          <div className="min-w-0">
            <div className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs uppercase tracking-[0.22em] text-white/65">
              {categoryLabel}
            </div>

            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[0.95] md:text-5xl">
              {service.name}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/72 md:text-lg">
              {service.description ?? service.address}
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-sm">
              {typeof service.distanceMeters === "number" ? (
                <span className="rounded-full bg-accent/10 px-4 py-2 font-medium text-accentDark">
                  {formatDistance(service.distanceMeters)}
                </span>
              ) : null}
              <span className="rounded-full bg-white/[0.06] px-4 py-2 text-white/72">
                {freshnessCopy(service.freshnessState)}
              </span>
              {typeof service.openNow === "boolean" ? (
                <span className="rounded-full bg-white/[0.06] px-4 py-2 text-white/72">
                  {service.openNow ? "Open now" : "Closed now"}
                </span>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={buildDirectionsUrl(service)}
                target="_blank"
                rel="noreferrer"
                className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-3 font-medium"
              >
                Open directions
              </a>
              <Link
                href={`/chat?${locationParams}`}
                className="btn-secondary inline-flex items-center gap-2 rounded-full px-5 py-3 font-medium"
              >
                Ask grounded chat
              </Link>
              {service.website ? (
                <a
                  href={service.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[0.04] px-5 py-3 font-medium text-white/80 transition hover:bg-white/[0.08]"
                >
                  Visit source
                  <ExternalLink className="h-4 w-4" strokeWidth={2.2} />
                </a>
              ) : null}
            </div>
          </div>

          <div className="min-w-0">
            <div className="surface-card overflow-hidden rounded-[1.9rem]">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">Service location</p>
                  <p className="mt-1 text-sm text-white/72">{location.label}</p>
                </div>
                <div className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs uppercase tracking-[0.16em] text-white/60">
                  Exact point
                </div>
              </div>
              {hasGoogleMapsEnv ? (
                <img
                  src={`/api/location/static-map?${staticMapParams.toString()}`}
                  alt={`Map showing the location of ${service.name}`}
                  className="block h-[240px] w-full object-cover"
                />
              ) : (
                <div className="grid h-[240px] place-items-center px-6 text-center text-sm text-white/55">
                  Google Static Maps is not configured, so the location preview is unavailable.
                </div>
              )}
              <div className="border-t border-white/10 px-5 py-4 text-sm text-white/68">
                {service.address}
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-6 grid gap-4 md:grid-cols-3">
          <div className="surface-subtle rounded-[1.75rem] p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[0.06] text-accentDark">
                <MapPin className="h-5 w-5" strokeWidth={2.1} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Visit</p>
                <h2 className="font-display text-2xl font-semibold">Address and contact</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-white/68">
              <p>{service.address}</p>
              {service.phone ? (
                <p className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4 text-accentDark" strokeWidth={2.1} />
                  <span>{service.phone}</span>
                </p>
              ) : null}
              {service.website ? (
                <p className="inline-flex items-center gap-2">
                  <Globe2 className="h-4 w-4 text-accentDark" strokeWidth={2.1} />
                  <a href={service.website} target="_blank" rel="noreferrer" className="text-accentDark underline">
                    Visit source website
                  </a>
                </p>
              ) : null}
            </div>
          </div>

          <div className="surface-subtle rounded-[1.75rem] p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[0.06] text-accentDark">
                <Clock3 className="h-5 w-5" strokeWidth={2.1} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Availability</p>
                <h2 className="font-display text-2xl font-semibold">Hours and access</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-white/68">
              <p>{service.hoursText ?? "Hours were not provided for this listing."}</p>
              <p>{typeof service.openNow === "boolean" ? (service.openNow ? "Reported open now." : "Reported closed now.") : "Call first to confirm current availability."}</p>
              {service.eligibilityNotes ? <p>{service.eligibilityNotes}</p> : null}
            </div>
          </div>

          <div className="surface-subtle rounded-[1.75rem] p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/[0.06] text-accentDark">
                <ShieldCheck className="h-5 w-5" strokeWidth={2.1} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Trust</p>
                <h2 className="font-display text-2xl font-semibold">Source and verification</h2>
              </div>
            </div>
            <div className="mt-5 grid gap-3 text-sm text-white/68">
              <p>Source: {service.sourceName ?? service.sourceType}</p>
              <p>Status: {freshnessCopy(service.freshnessState)}</p>
              {service.lastVerifiedAt ? (
                <p>Verified: {new Date(service.lastVerifiedAt).toLocaleDateString()}</p>
              ) : (
                <p className="inline-flex items-start gap-2">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-accentDark" strokeWidth={2.1} />
                  <span>No verification date was provided. Call ahead before traveling.</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
