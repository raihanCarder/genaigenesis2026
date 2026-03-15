"use client";

import { startTransition, useEffect, useState } from "react";
import { HelplineFooter } from "@/components/helpline-footer";
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
  const setLocation = useAppStore((state) => state.setLocation);
  const setServices = useAppStore((state) => state.setServices);

  useEffect(() => {
    setLocation(location);
    setServices(services);
  }, [location, services, setLocation, setServices]);

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
      />

      {warnings.length > 0 ? (
        <section className="rounded-4xl border border-amber-200 bg-amber-50 p-6 shadow-card">
          <h2 className="font-display text-2xl font-semibold text-amber-950">
            Before you go
          </h2>
          <div className="mt-3 grid gap-2 text-sm text-amber-900">
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </section>
      ) : null}

      <DashboardCategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
      />

      {loading ? (
        <section className="rounded-4xl border border-black/5 bg-white p-8 text-center shadow-card">
          Loading nearby services...
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
