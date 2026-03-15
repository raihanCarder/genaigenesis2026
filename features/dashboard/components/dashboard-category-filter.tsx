"use client";

import { categoryOrder } from "@/lib/constants/categories";
import type { ServiceCategory } from "@/lib/types";
import { formatCategoryLabel } from "@/lib/utils";

export function DashboardCategoryFilter({
  selectedCategory,
  onSelectCategory
}: {
  selectedCategory: ServiceCategory | null;
  onSelectCategory: (category: ServiceCategory | null) => void;
}) {
  return (
    <section id="nearby-services" className="glass-panel scroll-mt-24 rounded-4xl p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-theme-faint text-xs uppercase tracking-[0.22em]">Browse by need</p>
          <h2 className="font-display text-2xl font-semibold">Essential services near you</h2>
        </div>
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={`rounded-full px-4 py-2 text-sm ${selectedCategory ? "btn-secondary" : "btn-primary"}`}
        >
          All categories
        </button>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {categoryOrder.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => onSelectCategory(category)}
            className={`rounded-full px-4 py-2 text-sm transition ${
              selectedCategory === category
                ? "btn-primary"
                : "btn-secondary"
            }`}
          >
            {formatCategoryLabel(category)}
          </button>
        ))}
      </div>
    </section>
  );
}
