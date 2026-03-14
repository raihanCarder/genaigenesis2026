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
    <section className="glass-panel rounded-4xl p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-black/45">Browse by need</p>
          <h2 className="font-display text-2xl font-semibold">Essential services near you</h2>
        </div>
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={`rounded-full px-4 py-2 text-sm ${selectedCategory ? "bg-black/5" : "bg-ink text-white"}`}
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
                ? "bg-accent text-white"
                : "border border-black/10 bg-white hover:border-accent/30 hover:bg-accent/5"
            }`}
          >
            {formatCategoryLabel(category)}
          </button>
        ))}
      </div>
    </section>
  );
}

