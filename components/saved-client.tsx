"use client";

import { useEffect, useState } from "react";
import type { LocationContext, ServiceWithMeta } from "@/lib/types";
import { buildLocationSearchParams } from "@/lib/location";
import { useAppStore } from "@/store/app-store";
import { ServiceCard } from "@/components/service-card";
import { SignInButton } from "@/components/sign-in-button";

export function SavedClient({ initialLocation }: { initialLocation: LocationContext }) {
  const user = useAppStore((state) => state.user);
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
        const result = await fetch("/api/favorites");
        const payload = (await result.json()) as ServiceWithMeta[] | { error?: string };
        if (!result.ok || !Array.isArray(payload)) {
          throw new Error(
            !Array.isArray(payload) && typeof payload.error === "string"
              ? payload.error
              : "Unable to load favorites."
          );
        }
        setFavorites(payload);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load favorites.");
      } finally {
        setLoading(false);
      }
    }
    void loadFavorites();
  }, [user]);

  const locationParams = buildLocationSearchParams(initialLocation);

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <section className="grid gap-5 rounded-[2rem] bg-ink px-6 py-8 text-white shadow-card">
          <p className="text-xs uppercase tracking-[0.22em] text-white/55">Signed-in feature</p>
          <h1 className="font-display text-4xl font-semibold">Save services for later</h1>
          <p className="max-w-2xl text-white/78">
            Create an account or log in to keep your shortlist of reliable places and return to them later.
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
        <p className="text-xs uppercase tracking-[0.22em] text-black/45">Saved places</p>
        <h1 className="font-display text-3xl font-semibold">Your shortlist</h1>
        <p className="mt-3 text-black/65">Keep important services easy to revisit.</p>
      </section>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? <div className="rounded-4xl bg-white p-6 shadow-card">Loading favorites...</div> : null}
        {error ? (
          <div className="rounded-4xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-card">
            {error}
          </div>
        ) : null}
        {!loading && favorites.length === 0 ? (
          <div className="rounded-4xl bg-white p-6 text-black/55 shadow-card">
            No favorites yet. Save services from the dashboard or detail views.
          </div>
        ) : null}
        {favorites.map((service) => (
          <ServiceCard key={service.id} service={service} locationParams={locationParams} />
        ))}
      </div>
    </div>
  );
}
