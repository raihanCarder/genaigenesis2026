"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { categoryOrder } from "@/lib/constants/categories";
import { buildLocationSearchParams } from "@/lib/location";
import { scoreService } from "@/lib/services/ranking";
import type { LocationContext, ServiceCategory, ServiceWithMeta } from "@/lib/types";
import { formatCategoryLabel } from "@/lib/utils";
import { ServiceCard } from "@/components/service-card";

const CAROUSEL_PAGE_SIZE = 2;

function ServiceCarouselRow({
  services,
  locationParams,
  category
}: {
  services: ServiceWithMeta[];
  locationParams: string;
  category: ServiceCategory;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const totalPages = Math.max(1, Math.ceil(services.length / CAROUSEL_PAGE_SIZE));
  const canScrollLeft = pageIndex > 0;
  const canScrollRight = pageIndex < totalPages - 1;
  const visibleServices = services.slice(
    pageIndex * CAROUSEL_PAGE_SIZE,
    pageIndex * CAROUSEL_PAGE_SIZE + CAROUSEL_PAGE_SIZE
  );
  const recommendedServiceId =
    services.reduce<ServiceWithMeta | null>((best, service) => {
      if (!best) {
        return service;
      }
      return scoreService(service) > scoreService(best) ? service : best;
    }, null)?.id ?? null;

  useEffect(() => {
    setPageIndex((current) => Math.min(current, totalPages - 1));
  }, [totalPages]);

  function changePage(direction: -1 | 1) {
    setPageIndex((current) => Math.min(Math.max(current + direction, 0), totalPages - 1));
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => changePage(-1)}
        disabled={!canScrollLeft}
        aria-label={`Previous ${formatCategoryLabel(category)} services`}
        className="surface-card flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/18 text-white transition hover:border-accent/45 hover:bg-accent/10 hover:text-accentDark disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2.4} />
      </button>
      <div className="grid flex-1 gap-4 py-1 grid-cols-1 md:grid-cols-2">
        {visibleServices.map((service) => (
          <div key={service.id} className="min-w-0">
            <ServiceCard
              service={service}
              locationParams={locationParams}
              recommendedByBeacon={service.id === recommendedServiceId}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => changePage(1)}
        disabled={!canScrollRight}
        aria-label={`Next ${formatCategoryLabel(category)} services`}
        className="surface-card flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/18 text-white transition hover:border-accent/45 hover:bg-accent/10 hover:text-accentDark disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronRight className="h-5 w-5" strokeWidth={2.4} />
      </button>
    </div>
  );
}

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
      <section className="surface-card rounded-4xl p-8 shadow-card">
        <h2 className="font-display text-2xl font-semibold">No exact matches in this view</h2>
        <p className="mt-3 max-w-2xl text-white/65">
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
                <p className="text-xs uppercase tracking-[0.22em] text-white/45">Category</p>
                <h2 className="font-display text-2xl font-semibold">
                  {formatCategoryLabel(group.category)}
                </h2>
              </div>
              <div className="text-sm text-white/55">{group.services.length} options</div>
            </div>
            <ServiceCarouselRow
              category={group.category}
              services={group.services}
              locationParams={locationParams}
            />
          </section>
        ) : null
      )}
    </>
  );
}
