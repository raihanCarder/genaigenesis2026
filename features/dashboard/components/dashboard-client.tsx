"use client";

import { startTransition, useState } from "react";
import { HelplineFooter } from "@/components/helpline-footer";
import { BouncingDots } from "@/components/ui/bouncing-dots";
import { DashboardCategoryFilter } from "@/features/dashboard/components/dashboard-category-filter";
import { DashboardHero } from "@/features/dashboard/components/dashboard-hero";
import { DashboardServiceSections } from "@/features/dashboard/components/dashboard-service-sections";
import { useDashboardServices } from "@/features/dashboard/hooks/use-dashboard-services";
import type { LocationContext, ServiceCategory } from "@/lib/types";
import { useAppStore } from "@/store/app-store";

export function DashboardClient({
  initialLocation,
}: {
  initialLocation: LocationContext;
}) {
  const [selectedCategory, setSelectedCategory] =
    useState<ServiceCategory | null>(null);
  const { services, loading, error, location, warnings } = useDashboardServices(initialLocation);
  const user = useAppStore((state) => state.user);

  function handleSelectCategory(category: ServiceCategory | null) {
    startTransition(() => {
      setSelectedCategory(category);
    });
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-6">
      <DashboardHero
        location={location}
        user={user}
        selectedCategory={selectedCategory}
        services={services}
        loading={loading}
      />

      {warnings.length > 0 ? (
        <section className="glass-panel relative overflow-hidden rounded-4xl p-6 shadow-card md:p-7">
          <div className="relative grid gap-6 md:grid-cols-[0.82fr_1.18fr] md:gap-8">
            <div className="space-y-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-accentDark">
                <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_18px_rgba(242,140,40,0.75)]" />
                Time-sensitive checks
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                  Heads up
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-white">
                  Before you go
                </h2>
              </div>

              <p className="max-w-sm text-sm leading-6 text-white/62">
                A few details still need manual confirmation before you make
                the trip.
              </p>
            </div>

            <div className="grid gap-3">
              {warnings.map((warning) => (
                <div
                  key={warning}
                  className="surface-card flex items-start gap-3 rounded-3xl p-4"
                >
                  <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-accent shadow-[0_0_18px_rgba(242,140,40,0.65)]" />
                  <p className="text-sm leading-6 text-white/72">{warning}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <DashboardCategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
      />

      {loading ? (
        <section
          aria-busy="true"
          aria-live="polite"
          className="glass-panel rounded-4xl p-5 shadow-card"
        >
          <div className="surface-card flex min-h-[10rem] items-center justify-center rounded-[1.75rem] px-6 py-8 text-center text-sm text-white/58">
            <BouncingDots
              message="Loading nearby services..."
              messagePlacement="right"
              className="bg-accentDark"
            />
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="error-panel rounded-4xl p-6 shadow-card">
          <h2 className="font-display text-2xl font-semibold">
            Unable to load services
          </h2>
          <p className="mt-3 text-sm">{error}</p>
        </section>
      ) : null}

      {!loading && !error ? (
        <DashboardServiceSections
          location={location}
          selectedCategory={selectedCategory}
          services={services}
        />
      ) : null}

      <HelplineFooter />
    </div>
  );
}
