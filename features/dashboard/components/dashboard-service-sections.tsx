"use client";

import { useEffect, useState } from "react";
import { categoryOrder } from "@/lib/constants/categories";
import { buildLocationSearchParams } from "@/lib/location";
import type { LocationContext, ServiceCategory, ServiceWithMeta } from "@/lib/types";
import { formatCategoryLabel } from "@/lib/utils";
import { ServiceCard } from "@/components/service-card";

const CAROUSEL_PAGE_SIZE = 3;

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
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-lg font-semibold transition hover:border-accent/30 hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-35"
      >
        {"<"}
      </button>
      <div className="grid flex-1 gap-4 py-1 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {visibleServices.map((service) => (
          <div key={service.id} className="min-w-0">
            <ServiceCard service={service} locationParams={locationParams} />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => changePage(1)}
        disabled={!canScrollRight}
        aria-label={`Next ${formatCategoryLabel(category)} services`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-lg font-semibold transition hover:border-accent/30 hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-35"
      >
        {">"}
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
