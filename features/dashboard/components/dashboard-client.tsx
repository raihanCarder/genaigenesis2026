"use client";

import { startTransition, useState } from "react";
import { HelplineFooter } from "@/components/helpline-footer";
import { DashboardCategoryFilter } from "@/features/dashboard/components/dashboard-category-filter";
import { DashboardHero } from "@/features/dashboard/components/dashboard-hero";
import { DashboardServiceSections } from "@/features/dashboard/components/dashboard-service-sections";
import { useDashboardServices } from "@/features/dashboard/hooks/use-dashboard-services";
import type { LocationContext, ServiceCategory } from "@/lib/types";
import { useAppStore } from "@/store/app-store";

export function DashboardClient({ initialLocation }: { initialLocation: LocationContext }) {
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const { services, loading, error } = useDashboardServices(initialLocation);
  const user = useAppStore((state) => state.user);

  function handleSelectCategory(category: ServiceCategory | null) {
    startTransition(() => {
      setSelectedCategory(category);
    });
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:px-6">
      <DashboardHero location={initialLocation} user={user} selectedCategory={selectedCategory} />
      <DashboardCategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
      />

      {loading ? (
        <section className="rounded-4xl border border-black/5 bg-white p-8 text-center shadow-card">
          Loading Toronto services...
        </section>
      ) : null}

      {error ? (
        <section className="rounded-4xl border border-red-200 bg-red-50 p-6 shadow-card">
          <h2 className="font-display text-2xl font-semibold text-red-900">Unable to load services</h2>
          <p className="mt-3 text-sm text-red-800">{error}</p>
        </section>
      ) : null}

      {!loading && !error ? (
        <DashboardServiceSections
          location={initialLocation}
          selectedCategory={selectedCategory}
          services={services}
        />
      ) : null}

      <HelplineFooter />
    </div>
  );
}

