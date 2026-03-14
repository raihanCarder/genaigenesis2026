"use client";

import { categoryOrder } from "@/lib/constants/categories";
import { buildLocationSearchParams } from "@/lib/location";
import type { LocationContext, ServiceCategory, ServiceWithMeta } from "@/lib/types";
import { formatCategoryLabel } from "@/lib/utils";
import { ServiceCard } from "@/components/service-card";

export function DashboardServiceSections({
  location,
  selectedCategory,
  services
}: {
  location: LocationContext;
  selectedCategory: ServiceCategory | null;
  services: ServiceWithMeta[];
}) {
  const locationParams = buildLocationSearchParams(location);
  const visibleServices = selectedCategory
    ? services.filter((service) => service.category === selectedCategory)
    : services;

  const grouped = categoryOrder.map((category) => ({
    category,
    services: visibleServices.filter((service) => service.category === category)
  }));

  if (visibleServices.length === 0) {
    return (
      <section className="rounded-4xl border border-black/5 bg-white p-8 shadow-card">
        <h2 className="font-display text-2xl font-semibold">No exact matches in this view</h2>
        <p className="mt-3 max-w-2xl text-black/65">
          Try switching categories, returning to all results, or using chat to broaden the search.
        </p>
      </section>
    );
  }

  return (
    <>
      {grouped.map((group) =>
        group.services.length > 0 ? (
          <section key={group.category} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-black/45">Category</p>
                <h2 className="font-display text-2xl font-semibold">
                  {formatCategoryLabel(group.category)}
                </h2>
              </div>
              <div className="text-sm text-black/55">{group.services.length} options</div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.services.map((service) => (
                <ServiceCard key={service.id} service={service} locationParams={locationParams} />
              ))}
            </div>
          </section>
        ) : null
      )}
    </>
  );
}

