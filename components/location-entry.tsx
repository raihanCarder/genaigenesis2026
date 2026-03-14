"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import { TORONTO_CENTER } from "@/lib/adapters/google-maps";
import { fetchJson } from "@/lib/api/fetch-json";
import { buildLocationSearchParams } from "@/lib/location";
import {
  LocationAutocompleteResponseSchema,
  LocationGeocodeResponseSchema,
  type LocationContext,
  type LocationSuggestion
} from "@/lib/types";
import { useAppStore } from "@/store/app-store";

const AUTOCOMPLETE_DEBOUNCE_MS = 250;

function createSessionToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildDashboardHref(location: LocationContext) {
  return `/dashboard?${buildLocationSearchParams(location)}`;
}

function toLocationContext(payload: {
  latitude: number;
  longitude: number;
  label: string;
  placeId?: string;
  city?: string;
  region?: string;
  country?: string;
}) {
  return {
    latitude: payload.latitude,
    longitude: payload.longitude,
    label: payload.label,
    placeId: payload.placeId,
    city: payload.city,
    region: payload.region,
    country: payload.country
  } satisfies LocationContext;
}

export function LocationEntry() {
  const router = useRouter();
  const setLocation = useAppStore((state) => state.setLocation);
  const blurTimeoutRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState("Downtown Toronto");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [sessionToken, setSessionToken] = useState(() => createSessionToken());

  const activeSuggestion = suggestions[highlightedIndex >= 0 ? highlightedIndex : 0];

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current !== null) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setSuggestions([]);
      setHighlightedIndex(-1);
      setLoadingSuggestions(false);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setLoadingSuggestions(true);
      try {
        const params = new URLSearchParams({
          input: trimmedQuery,
          sessionToken
        });
        const payload = await fetchJson<unknown>(`/api/location/autocomplete?${params.toString()}`);
        const nextSuggestions = LocationAutocompleteResponseSchema.parse(payload);
        if (requestId !== requestIdRef.current) {
          return;
        }
        setSuggestions(nextSuggestions);
        setHighlightedIndex(nextSuggestions.length > 0 ? 0 : -1);
      } catch {
        if (requestId === requestIdRef.current) {
          setSuggestions([]);
          setHighlightedIndex(-1);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoadingSuggestions(false);
        }
      }
    }, AUTOCOMPLETE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [query, sessionToken]);

  async function pushLocation(location: LocationContext) {
    startTransition(() => {
      setLocation(location);
      router.push(buildDashboardHref(location));
    });
  }

  function resetAutocomplete() {
    setSuggestions([]);
    setHighlightedIndex(-1);
    setSessionToken(createSessionToken());
  }

  async function resolveAndPushLocation(input: {
    location?: string;
    placeId?: string;
    latitude?: number;
    longitude?: number;
    label?: string;
  }) {
    const payload = await fetchJson<unknown>("/api/location/geocode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input)
    });
    const resolved = LocationGeocodeResponseSchema.parse(payload);
    await pushLocation(
      toLocationContext({
        latitude: resolved.latitude,
        longitude: resolved.longitude,
        label: resolved.label ?? resolved.normalizedLocation,
        placeId: resolved.placeId,
        city: resolved.city,
        region: resolved.region,
        country: resolved.country
      })
    );
  }

  async function submitTypedLocation() {
    await resolveAndPushLocation({ location: query });
  }

  async function submitSuggestion(suggestion: LocationSuggestion) {
    setQuery(suggestion.label);
    await resolveAndPushLocation({
      location: suggestion.label,
      placeId: suggestion.placeId,
      label: suggestion.label
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (activeSuggestion) {
        await submitSuggestion(activeSuggestion);
      } else {
        await submitTypedLocation();
      }
      resetAutocomplete();
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
        try {
          await resolveAndPushLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            label: "Current location"
          });
        } catch {
          await pushLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            label: "Current location"
          });
        } finally {
          setPending(false);
        }
      },
      () => {
        setError("We could not access your current location. Try typing a neighborhood or address.");
        setPending(false);
      }
    );
  }

  function handleDemoLocation() {
    resetAutocomplete();
    void pushLocation(TORONTO_CENTER);
  }

  const showSuggestions = inputFocused && (loadingSuggestions || suggestions.length > 0);

  return (
    <form onSubmit={handleSubmit} className="glass-panel rounded-4xl p-6 shadow-card">
      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-black/65">Enter a location</span>
          <div className="relative">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setError(null);
              }}
              onFocus={() => {
                if (blurTimeoutRef.current !== null) {
                  window.clearTimeout(blurTimeoutRef.current);
                }
                setInputFocused(true);
              }}
              onBlur={() => {
                blurTimeoutRef.current = window.setTimeout(() => setInputFocused(false), 120);
              }}
              onKeyDown={(event) => {
                if (!showSuggestions || suggestions.length === 0) {
                  return;
                }
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setHighlightedIndex((current) => (current + 1) % suggestions.length);
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setHighlightedIndex((current) =>
                    current <= 0 ? suggestions.length - 1 : current - 1
                  );
                }
                if (event.key === "Escape") {
                  setInputFocused(false);
                }
                if (event.key === "Enter" && activeSuggestion) {
                  event.preventDefault();
                  setPending(true);
                  setError(null);
                  void submitSuggestion(activeSuggestion)
                    .then(() => resetAutocomplete())
                    .catch((caughtError) => {
                      setError(
                        caughtError instanceof Error
                          ? caughtError.message
                          : "Unable to set location."
                      );
                    })
                    .finally(() => setPending(false));
                }
              }}
              placeholder="Downtown Toronto"
              autoComplete="off"
              aria-expanded={showSuggestions}
              aria-controls="location-suggestion-list"
              className="w-full rounded-3xl border border-black/10 bg-white px-5 py-4 outline-none transition focus:border-accent"
            />
            {showSuggestions ? (
              <div
                id="location-suggestion-list"
                role="listbox"
                className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 grid overflow-hidden rounded-3xl border border-black/10 bg-white shadow-card"
              >
                {loadingSuggestions && suggestions.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-black/50">Finding likely locations...</p>
                ) : null}
                {suggestions.map((suggestion, index) => {
                  const highlighted = index === (highlightedIndex >= 0 ? highlightedIndex : 0);
                  return (
                    <button
                      key={`${suggestion.placeId ?? suggestion.label}-${index}`}
                      type="button"
                      role="option"
                      aria-selected={highlighted}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setPending(true);
                        setError(null);
                        void submitSuggestion(suggestion)
                          .then(() => resetAutocomplete())
                          .catch((caughtError) => {
                            setError(
                              caughtError instanceof Error
                                ? caughtError.message
                                : "Unable to set location."
                            );
                          })
                          .finally(() => setPending(false));
                      }}
                      className={`grid gap-1 px-4 py-3 text-left transition ${
                        highlighted ? "bg-[#f7efe4]" : "bg-white hover:bg-black/5"
                      }`}
                    >
                      <span className="text-sm font-medium text-black">{suggestion.primaryText}</span>
                      {suggestion.secondaryText ? (
                        <span className="text-sm text-black/55">{suggestion.secondaryText}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </label>
        <div className="flex flex-col gap-3 md:flex-row">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-ink px-5 py-3 font-medium text-white transition hover:bg-accentDark disabled:opacity-60"
          >
            {pending ? "Finding services..." : "Open dashboard"}
          </button>
          <button
            type="button"
            onClick={handleCurrentLocation}
            className="rounded-full border border-black/10 bg-white px-5 py-3 font-medium transition hover:border-accent/40 hover:bg-accent/5"
          >
            Use my location
          </button>
          <button
            type="button"
            onClick={handleDemoLocation}
            className="rounded-full border border-black/10 bg-black/5 px-5 py-3 font-medium transition hover:bg-black/10"
          >
            Load Toronto demo
          </button>
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>
    </form>
  );
}
