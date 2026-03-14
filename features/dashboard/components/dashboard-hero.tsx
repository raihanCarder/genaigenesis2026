"use client";

import Link from "next/link";
import { buildLocationSearchParams } from "@/lib/location";
import type { LocationContext, ServiceCategory, SessionUser } from "@/lib/types";

export function DashboardHero({
  location,
  user,
  selectedCategory
}: {
  location: LocationContext;
  user: SessionUser | null;
  selectedCategory: ServiceCategory | null;
}) {
  const chatParams = buildLocationSearchParams(location, {
    category: selectedCategory ?? undefined
  });
  const planParams = buildLocationSearchParams(location);

  return (
    <section className="grid gap-4 rounded-[2rem] bg-ink px-6 py-8 text-white shadow-card md:grid-cols-[1.4fr,0.9fr]">
      <div className="space-y-4">
        <p className="text-sm uppercase tracking-[0.24em] text-white/60">Current location</p>
        <h1 className="font-display text-4xl font-semibold leading-tight">{location.label}</h1>
        <p className="max-w-xl text-base text-white/78">
          Start with nearby essentials, then use chat for grounded recommendations. Stability planning stays available once you sign in.
        </p>
      </div>
      <div className="grid gap-3 rounded-[1.75rem] bg-white/8 p-4">
        <Link
          href={`/chat?${chatParams}`}
          className="rounded-[1.5rem] bg-white px-5 py-4 text-sm font-semibold text-ink transition hover:bg-[#f7efe4]"
        >
          Open grounded chat
        </Link>
        <Link
          href={`/plan?${planParams}`}
          className="rounded-[1.5rem] border border-white/20 px-5 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          {user ? "Build stability roadmap" : "Log in for roadmap planning"}
        </Link>
      </div>
    </section>
  );
}
