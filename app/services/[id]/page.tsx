import Link from "next/link";
import { notFound } from "next/navigation";
import { FavoriteButton } from "@/components/favorite-button";
import { buildDirectionsUrl, TORONTO_CENTER } from "@/lib/adapters/google-maps";
import { getServiceById } from "@/lib/services/query";

function getLocationFromSearchParams(searchParams: Record<string, string | string[] | undefined>) {
  const lat = Number(searchParams.lat);
  const lng = Number(searchParams.lng);
  const label = typeof searchParams.label === "string" ? searchParams.label : TORONTO_CENTER.label;
  return Number.isFinite(lat) && Number.isFinite(lng)
    ? { latitude: lat, longitude: lng, label }
    : TORONTO_CENTER;
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
    longitude: location.longitude
  });

  if (!service) {
    notFound();
  }

  const locationParams = new URLSearchParams({
    lat: location.latitude.toString(),
    lng: location.longitude.toString(),
    label: location.label
  }).toString();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <section className="glass-panel rounded-4xl p-6 shadow-card">
        <p className="text-xs uppercase tracking-[0.22em] text-white/45">{service.category}</p>
        <h1 className="mt-2 font-display text-4xl font-semibold">{service.name}</h1>
        <p className="mt-4 text-lg text-white/68">{service.description ?? service.address}</p>

        <div className="surface-card mt-6 grid gap-4 rounded-[1.75rem] p-5 md:grid-cols-2">
          <div className="space-y-2 text-sm text-white/65">
            <p><span className="font-semibold text-white">Address:</span> {service.address}</p>
            {service.hoursText ? (
              <p><span className="font-semibold text-white">Hours:</span> {service.hoursText}</p>
            ) : null}
            {service.phone ? (
              <p><span className="font-semibold text-white">Phone:</span> {service.phone}</p>
            ) : null}
            {service.website ? (
              <p>
                <span className="font-semibold text-white">Website:</span>{" "}
                <a href={service.website} target="_blank" rel="noreferrer" className="text-accentDark underline">
                  Visit source
                </a>
              </p>
            ) : null}
          </div>
          <div className="space-y-2 text-sm text-white/65">
            <p><span className="font-semibold text-white">Freshness:</span> {service.freshnessState ?? "unknown"}</p>
            <p><span className="font-semibold text-white">Source:</span> {service.sourceName ?? service.sourceType}</p>
            {service.lastVerifiedAt ? (
              <p><span className="font-semibold text-white">Verified:</span> {new Date(service.lastVerifiedAt).toLocaleDateString()}</p>
            ) : null}
            {service.eligibilityNotes ? (
              <p><span className="font-semibold text-white">Notes:</span> {service.eligibilityNotes}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={buildDirectionsUrl(service)}
            target="_blank"
            rel="noreferrer"
            className="btn-primary rounded-full px-5 py-3 font-medium"
          >
            Open directions
          </a>
          <Link
            href={`/chat?${locationParams}`}
            className="btn-secondary rounded-full px-5 py-3 font-medium"
          >
            Ask grounded chat
          </Link>
          <FavoriteButton service={service} />
        </div>
      </section>
    </div>
  );
}
