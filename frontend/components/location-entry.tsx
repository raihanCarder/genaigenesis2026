"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startTransition } from "react";
import { TORONTO_CENTER } from "@/lib/adapters/google-maps";
import { useAppStore } from "@/store/app-store";

function buildDashboardHref(input: { latitude: number; longitude: number; label: string }) {
  const params = new URLSearchParams({
    lat: input.latitude.toString(),
    lng: input.longitude.toString(),
    label: input.label
  });
  return `/dashboard?${params.toString()}`;
}

export function LocationEntry() {
  const router = useRouter();
  const setLocation = useAppStore((state) => state.setLocation);
  const [query, setQuery] = useState("Downtown Toronto");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function pushLocation(input: { latitude: number; longitude: number; label: string }) {
    startTransition(() => {
      setLocation(input);
      router.push(buildDashboardHref(input));
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/location/geocode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ location: query })
      });
      if (!response.ok) {
        throw new Error("We could not place that location.");
      }
      const payload = (await response.json()) as {
        normalizedLocation: string;
        latitude: number;
        longitude: number;
      };
      await pushLocation({
        latitude: payload.latitude,
        longitude: payload.longitude,
        label: payload.normalizedLocation
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to set location.");
    } finally {
      setPending(false);
    }
  }

  function handleCurrentLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Browser geolocation is not available.");
      return;
    }
    setPending(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await pushLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: "Current location"
        });
        setPending(false);
      },
      () => {
        setError("We could not access your current location. Try typing a Toronto neighborhood.");
        setPending(false);
      }
    );
  }

  function handleDemoLocation() {
    void pushLocation(TORONTO_CENTER);
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel rounded-4xl p-6 shadow-card">
      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-white/65">Enter a location</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Downtown Toronto"
            className="input-surface rounded-3xl px-5 py-4 outline-none transition"
          />
        </label>
        <div className="flex flex-col gap-3 md:flex-row">
          <button
            type="submit"
            disabled={pending}
            className="btn-primary rounded-full px-5 py-3 font-medium disabled:opacity-60"
          >
            {pending ? "Finding services..." : "Open dashboard"}
          </button>
          <button
            type="button"
            onClick={handleCurrentLocation}
            className="btn-secondary rounded-full px-5 py-3 font-medium"
          >
            Use my location
          </button>
          <button
            type="button"
            onClick={handleDemoLocation}
            className="btn-secondary rounded-full px-5 py-3 font-medium"
          >
            Load Toronto demo
          </button>
        </div>
        {error ? <p className="text-sm text-accentDark">{error}</p> : null}
      </div>
    </form>
  );
}
