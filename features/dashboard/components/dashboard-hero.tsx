"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Globe, type GlobeConfig } from "@/components/ui/globe";
import { buildLocationSearchParams } from "@/lib/location";
import type {
  LocationContext,
  ServiceCategory,
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getFocusedGlobeAngles(location: Pick<LocationContext, "latitude" | "longitude">) {
  const latitude = toRadians(clamp(location.latitude, -89.999, 89.999));
  const longitude = toRadians(location.longitude);
  const cosLatitude = Math.cos(latitude);
  const x = cosLatitude * Math.cos(longitude);
  const y = -cosLatitude * Math.sin(longitude);
  const z = Math.sin(latitude);

  return {
    phi: Math.atan2(-x, z),
    theta: Math.asin(clamp(y, -1, 1))
  };
}

export function DashboardHero({
  location,
  user,
  selectedCategory,
}: {
  location: LocationContext;
  user: SessionUser | null;
  selectedCategory: ServiceCategory | null;
}) {
  const chatParams = buildLocationSearchParams(location, {
    category: selectedCategory ?? undefined,
  });
  const planParams = buildLocationSearchParams(location);
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
          size: 0.12
        }
      ]
    } satisfies GlobeConfig;
  }, [location.latitude, location.longitude]);

  return (
    <section className="glass-panel relative overflow-hidden rounded-[2rem] px-6 py-8 text-white shadow-card md:px-8 md:py-9">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_34%)]" />

      <div className="relative grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-start md:gap-10">
        <div className="max-w-xl space-y-5 md:space-y-6">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.24em] text-white/60">
              Current location
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight">
              {location.label}
            </h1>
            <p className="max-w-xl text-base text-white/78">
              Start with nearby essentials, then use chat for grounded
              recommendations. Stability planning stays available once you sign
              in.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-white/75">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-4 py-2">
              Active view: {selectedCategoryLabel}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/[0.06] px-4 py-2">
              Toronto-first service coverage
            </span>
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
        </div>

        <div className="surface-card relative overflow-hidden rounded-[1.75rem]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.28),rgba(255,255,255,0))]" />

          <div className="relative flex min-h-[340px] flex-col justify-between gap-4 p-5 md:min-h-[360px] md:p-6">
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

            <div className="relative min-h-[240px] flex-1 md:min-h-[260px]">
              <Globe
                className="top-10 max-w-[380px] md:top-12 md:max-w-[560px]"
                config={globeConfig}
                pins={[
                  {
                    location: [location.latitude, location.longitude],
                    label: location.label
                  }
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
