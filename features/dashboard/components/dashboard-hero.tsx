"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { BouncingDots } from "@/components/ui/bouncing-dots";
import { Globe, type GlobeConfig } from "@/components/ui/globe";
import { buildLocationSearchParams } from "@/lib/location";
import type {
  LocationContext,
  ServiceCategory,
  ServiceWithMeta,
  SessionUser,
} from "@/lib/types";
import { formatCategoryLabel } from "@/lib/utils";

const WORLD_GLOBE_BASE_CONFIG: GlobeConfig = {
  dark: 0,
  diffuse: 0.55,
  mapBrightness: 1.15,
  baseColor: [0.98, 0.97, 0.94],
  markerColor: [221 / 255, 107 / 255, 32 / 255],
  glowColor: [1, 1, 1],
};

const HERO_SERVICE_COUNT = 2;
const WALKING_METERS_PER_MINUTE = 80;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getFocusedGlobeAngles(
  location: Pick<LocationContext, "latitude" | "longitude">,
) {
  const latitude = toRadians(clamp(location.latitude, -89.999, 89.999));
  const longitude = toRadians(location.longitude);
  const cosLatitude = Math.cos(latitude);
  const x = cosLatitude * Math.cos(longitude);
  const y = -cosLatitude * Math.sin(longitude);
  const z = Math.sin(latitude);

  return {
    phi: Math.atan2(-x, z),
    theta: Math.asin(clamp(y, -1, 1)),
  };
}

function distanceValue(distanceMeters?: number) {
  return typeof distanceMeters === "number" ? distanceMeters : Number.POSITIVE_INFINITY;
}

function freshnessPriority(state?: ServiceWithMeta["freshnessState"]) {
  if (state === "fresh") {
    return 2;
  }
  if (state === "unknown") {
    return 1;
  }
  return 0;
}

function pickHeroServices(services: ServiceWithMeta[]) {
  const prioritized = [...services].sort((left, right) => {
    const freshnessDelta =
      freshnessPriority(right.freshnessState) - freshnessPriority(left.freshnessState);
    if (freshnessDelta !== 0) {
      return freshnessDelta;
    }

    const openNowDelta = Number(right.openNow === true) - Number(left.openNow === true);
    if (openNowDelta !== 0) {
      return openNowDelta;
    }

    const distanceDelta = distanceValue(left.distanceMeters) - distanceValue(right.distanceMeters);
    if (distanceDelta !== 0) {
      return distanceDelta;
    }

    return (right.confidenceScore ?? 0) - (left.confidenceScore ?? 0);
  });

  const seenCategories = new Set<ServiceCategory>();
  const picks: ServiceWithMeta[] = [];

  for (const service of prioritized) {
    if (picks.length === HERO_SERVICE_COUNT) {
      break;
    }
    if (seenCategories.has(service.category)) {
      continue;
    }
    seenCategories.add(service.category);
    picks.push(service);
  }

  for (const service of prioritized) {
    if (picks.length === HERO_SERVICE_COUNT) {
      break;
    }
    if (picks.some((entry) => entry.id === service.id)) {
      continue;
    }
    picks.push(service);
  }

  return picks;
}

function formatWalkTime(distanceMeters?: number) {
  if (typeof distanceMeters !== "number" || Number.isNaN(distanceMeters)) {
    return "Nearby";
  }

  const minutes = Math.max(1, Math.round(distanceMeters / WALKING_METERS_PER_MINUTE));
  return `${minutes} min walk`;
}

function formatServiceTiming(service: ServiceWithMeta) {
  if (service.openNow && service.hoursText) {
    return `Open now • ${service.hoursText}`;
  }
  if (service.openNow) {
    return "Open now";
  }
  if (service.hoursText) {
    return service.hoursText;
  }
  if (service.freshnessState === "fresh") {
    return "Freshly verified";
  }
  if (service.freshnessState === "stale") {
    return "Verify before traveling";
  }
  return "Hours unconfirmed";
}

export function DashboardHero({
  location,
  user,
  selectedCategory,
  services,
  loading,
}: {
  location: LocationContext;
  user: SessionUser | null;
  selectedCategory: ServiceCategory | null;
  services: ServiceWithMeta[];
  loading: boolean;
}) {
  const chatParams = buildLocationSearchParams(location, {
    category: selectedCategory ?? undefined,
  });
  const planParams = buildLocationSearchParams(location);
  const detailParams = buildLocationSearchParams(location);
  const selectedCategoryLabel = selectedCategory
    ? formatCategoryLabel(selectedCategory)
    : "All essentials";
  const globeConfig = useMemo(() => {
    const { phi, theta } = getFocusedGlobeAngles(location);
    return {
      ...WORLD_GLOBE_BASE_CONFIG,
      phi,
      theta,
      markers: [
        {
          location: [location.latitude, location.longitude],
          size: 0.12,
        },
      ],
    } satisfies GlobeConfig;
  }, [location.latitude, location.longitude]);
  const servicesInView = useMemo(
    () =>
      selectedCategory
        ? services.filter((service) => service.category === selectedCategory)
        : services,
    [selectedCategory, services],
  );
  const heroServices = useMemo(
    () => pickHeroServices(servicesInView),
    [servicesInView],
  );
  const servicesHeading = selectedCategory
    ? `${selectedCategoryLabel} right now`
    : "Nearby essentials right now";

  return (
    <section className="glass-panel relative overflow-hidden rounded-[2rem] px-6 py-8 text-white shadow-card md:px-8 md:py-9">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_34%)]" />

      <div className="relative grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-stretch md:gap-10">
        <div className="max-w-xl space-y-5 md:space-y-6">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.24em] text-white/60">Location</p>
            <h1 className="font-display text-4xl font-semibold leading-tight">
              {location.label}
            </h1>
            <p className="max-w-xl text-base text-white/78">
              Start with nearby essentials, then use our chat for grounded
              recommendations. Stability planning stays available once you sign
              in.
            </p>
          </div>
          <div className="grid justify-items-start gap-3 sm:max-w-[42rem] sm:grid-cols-2 sm:justify-items-stretch">
            <Link
              href={`/chat?${chatParams}`}
              className="btn-primary inline-flex min-h-12 items-center justify-center rounded-full px-5 py-3 text-sm font-medium sm:w-full"
            >
              Open grounded chat
            </Link>
            <Link
              href={`/plan?${planParams}`}
              className="btn-secondary inline-flex min-h-12 items-center justify-center rounded-full px-5 py-3 text-sm font-medium sm:w-full"
            >
              {user
                ? "Build stability roadmap"
                : "Sign in for roadmap planning"}
            </Link>
          </div>

          <div className="surface-card rounded-[1.75rem] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-md">
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                  {servicesHeading}
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold">
                  Start with the strongest nearby options
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Pulled from the current dashboard search and prioritized for
                  fresh verification, open status, and proximity.
                </p>
              </div>

              <Link
                href="#nearby-services"
                className="btn-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
              >
                View all nearby services
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {loading ? (
              <div className="mt-5 flex min-h-[11rem] items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-6 py-8 text-center text-sm text-white/58">
                <BouncingDots
                  message="Pulling the strongest nearby services..."
                  messagePlacement="bottom"
                  className="bg-accentDark"
                />
              </div>
            ) : heroServices.length > 0 ? (
              <div className="mt-5 grid gap-3">
                {heroServices.map((service) => (
                  <Link
                    key={service.id}
                    href={`/services/${service.id}?${detailParams}`}
                    className="group rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-accent/35 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-accentDark">
                            {formatCategoryLabel(service.category)}
                          </span>
                          {service.freshnessState === "fresh" ? (
                            <span className="rounded-full bg-slate/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate">
                              Freshly verified
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-white transition group-hover:text-accentDark">
                          {service.name}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-white/60">
                          {formatWalkTime(service.distanceMeters)} •{" "}
                          {formatServiceTiming(service)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/72">
                        Details
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/58">
                No nearby matches are loaded for this view yet. Try the full
                results list below or open grounded chat to broaden the search.
              </div>
            )}
          </div>
        </div>

        <div className="surface-card relative overflow-hidden rounded-[1.75rem] md:h-full">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.28),rgba(255,255,255,0))]" />

          <div className="relative flex h-full min-h-[340px] flex-col justify-between gap-4 p-5 md:min-h-[360px] md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                  World pin
                </p>
                <h2 className="font-display text-3xl font-semibold leading-tight">
                  {location.label}
                </h2>
              </div>
              <div className="rounded-full border border-white/12 bg-white/[0.08] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/70">
                Selected location
              </div>
            </div>

            <div className="relative min-h-[320px] flex-1 md:min-h-[520px]">
              <Globe
                className="top-4 max-w-[420px] md:top-6 md:max-w-[620px]"
                config={globeConfig}
                pins={[
                  {
                    location: [location.latitude, location.longitude],
                    label: location.label,
                  },
                ]}
                autoRotateSpeed={0.005}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
