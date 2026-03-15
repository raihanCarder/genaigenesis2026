"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api/fetch-json";
import type { LocationContext, ServiceWithMeta } from "@/lib/types";
import { ServiceWithMetaSchema } from "@/lib/types";
import { buildLocationSearchParams } from "@/lib/location";
import { useAppStore } from "@/store/app-store";
import { ServiceCard } from "@/components/service-card";
import { SignInButton } from "@/components/sign-in-button";
import { BouncingDots } from "@/components/ui/bouncing-dots";

function SavedCardSkeleton() {
  return (
    <div className="surface-card flex h-[26rem] flex-col rounded-4xl p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-3 w-24 rounded-full bg-white/8" />
          <div className="h-6 w-3/4 rounded-full bg-white/10" />
          <div className="space-y-2 pt-1">
            <div className="h-4 w-full rounded-full bg-white/[0.07]" />
            <div className="h-4 w-5/6 rounded-full bg-white/[0.07]" />
          </div>
        </div>
        <div className="h-9 w-9 rounded-full bg-white/8" />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <div className="h-8 w-24 rounded-full bg-white/[0.07]" />
        <div className="h-8 w-32 rounded-full bg-white/[0.07]" />
        <div className="h-8 w-28 rounded-full bg-white/[0.07]" />
      </div>

      <div className="mt-5 space-y-2">
        <div className="h-4 w-11/12 rounded-full bg-white/[0.06]" />
        <div className="h-4 w-2/3 rounded-full bg-white/[0.06]" />
      </div>

      <div className="mt-auto flex items-end justify-between gap-4 pt-5">
        <div className="flex gap-3">
          <div className="h-10 w-24 rounded-full bg-white/[0.08]" />
          <div className="h-10 w-28 rounded-full bg-white/[0.06]" />
        </div>
        <div className="h-11 w-11 rounded-2xl bg-white/[0.06]" />
      </div>
    </div>
  );
}

export function SavedClient({
  initialLocation,
}: {
  initialLocation: LocationContext;
}) {
  const user = useAppStore((state) => state.user);
  const favoriteServiceIds = useAppStore((state) => state.favoriteServiceIds);
  const favoritesReady = useAppStore((state) => state.favoritesReady);
  const setFavoriteServiceIds = useAppStore((state) => state.setFavoriteServiceIds);
  const setFavoritesReady = useAppStore((state) => state.setFavoritesReady);
  const [favorites, setFavorites] = useState<ServiceWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFavorites() {
      if (!user) {
        setFavorites([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchJson<unknown>("/api/favorites", {
          cache: "no-store"
        });
        const parsed = ServiceWithMetaSchema.array().parse(payload);
        setFavorites(parsed);
        setFavoriteServiceIds(parsed.map((service) => service.id));
        setFavoritesReady(true);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load favorites.",
        );
      } finally {
        setLoading(false);
      }
    }
    void loadFavorites();
  }, [setFavoriteServiceIds, setFavoritesReady, user]);

  const locationParams = buildLocationSearchParams(initialLocation);
  const visibleFavorites = favoritesReady
    ? favorites.filter((service) => favoriteServiceIds.includes(service.id))
    : favorites;

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <section className="grid gap-5 rounded-[2rem] bg-ink px-6 py-8 text-white shadow-card">
          <p className="text-xs uppercase tracking-[0.22em] text-white/55">
            Signed-in feature
          </p>
          <h1 className="font-display text-4xl font-semibold">
            Save services for later
          </h1>
          <p className="max-w-2xl text-white/78">
            Create an account or log in to keep your shortlist of reliable
            places and return to them later.
          </p>
          <div className="w-fit">
            <SignInButton />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <section className="glass-panel rounded-4xl p-6 shadow-card">
        <p className="text-xs uppercase tracking-[0.22em] text-white/45">
          Saved places
        </p>
        <h1 className="font-display text-3xl font-semibold">Your shortlist</h1>
        <p className="mt-3 text-white/65">
          Keep important services easy to revisit.
        </p>
      </section>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <>
            <div className="glass-panel col-span-full rounded-4xl px-5 py-4 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                    Syncing saved services
                  </p>
                  <p className="mt-2 text-sm text-white/62">
                    Pulling your latest shortlist from the database.
                  </p>
                </div>
                <div
                  aria-busy="true"
                  aria-live="polite"
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/62"
                >
                  <BouncingDots
                    message="Loading favorites"
                    messagePlacement="right"
                    className="bg-accentDark"
                  />
                </div>
              </div>
            </div>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <SavedCardSkeleton />
              </div>
            ))}
          </>
        ) : null}
        {error ? (
          <div className="rounded-4xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-card">
            {error}
          </div>
        ) : null}
        {!loading && visibleFavorites.length === 0 ? (
          <div className="surface-card rounded-4xl p-6 text-white/55 shadow-card">
            No favorites yet. Save services from the dashboard or detail views.
          </div>
        ) : null}
        {visibleFavorites.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            locationParams={locationParams}
          />
        ))}
      </div>
    </div>
  );
}
