"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api/fetch-json";
import type { LocationContext, ServiceWithMeta } from "@/lib/types";
import { ServiceWithMetaSchema } from "@/lib/types";
import { buildLocationSearchParams } from "@/lib/location";
import { useAppStore } from "@/store/app-store";
import { ServiceCard } from "@/components/service-card";
import { SignInButton } from "@/components/sign-in-button";

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
          <div className="rounded-4xl bg-white p-6 shadow-card">
            Loading favorites...
          </div>
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
