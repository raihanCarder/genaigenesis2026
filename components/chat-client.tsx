"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchDashboardPayload } from "@/features/dashboard/api/dashboard-api";
import { fetchJson } from "@/lib/api/fetch-json";
import { buildLocationSearchParams } from "@/lib/location";
import {
  ChatResponseSchema,
  type ChatResponse,
  type DashboardPayload,
  type LocationContext,
  type ServiceCategory
} from "@/lib/types";
import { useAppStore } from "@/store/app-store";
import { ServiceCard } from "@/components/service-card";

const promptChips = [
  "Where can I get food tonight?",
  "What place is closest and open now?",
  "Which service can help me replace ID documents?",
  "Explain this service in simple language."
];

type ChatEntry =
  | { role: "user"; content: string }
  | { role: "assistant"; content: ChatResponse };

export function ChatClient({
  initialLocation,
  initialSelectedCategory
}: {
  initialLocation: LocationContext;
  initialSelectedCategory?: ServiceCategory;
}) {
  const services = useAppStore((state) => state.services);
  const setServices = useAppStore((state) => state.setServices);
  const setLocation = useAppStore((state) => state.setLocation);
  const location = useAppStore((state) => state.location) ?? initialLocation;
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState(promptChips[0]);
  const [loading, setLoading] = useState(false);
  const [contextPayload, setContextPayload] = useState<DashboardPayload | null>(null);

  useEffect(() => {
    setLocation(initialLocation);
  }, [initialLocation, setLocation]);

  useEffect(() => {
    let cancelled = false;

    void fetchDashboardPayload(initialLocation).then((payload) => {
      if (cancelled) {
        return;
      }
      setContextPayload(payload);
      setServices(payload.services);
      setLocation(payload.location);
    });

    return () => {
      cancelled = true;
    };
  }, [initialLocation, initialLocation.latitude, initialLocation.longitude, setLocation, setServices]);

  const locationParams = buildLocationSearchParams(location, {
    category: initialSelectedCategory
  });

  const visibleServices = services.slice(0, 12);

  async function sendMessage(message: string) {
    setLoading(true);
    setEntries((current) => [...current, { role: "user", content: message }]);
    try {
      const payload = await fetchJson<unknown>("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          location: {
            latitude: location.latitude,
            longitude: location.longitude
          },
          selectedCategory: initialSelectedCategory,
          services: visibleServices
        })
      });
      setEntries((current) => [
        ...current,
        { role: "assistant", content: ChatResponseSchema.parse(payload) }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[1.1fr_0.9fr] md:px-6">
      <section className="glass-panel rounded-4xl p-6 shadow-card">
        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Grounded chat</p>
        <h1 className="font-display text-3xl font-semibold">Ask about nearby support</h1>
        <p className="mt-3 text-white/65">
          The assistant only uses services already loaded for your area.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {promptChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                setInput(chip);
                void sendMessage(chip);
              }}
              className="btn-secondary rounded-full px-4 py-2 text-sm"
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4">
          {entries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 p-5 text-sm text-white/55">
              No messages yet. Use a prompt chip or ask your own question.
            </div>
          ) : null}
          {entries.map((entry, index) =>
            entry.role === "user" ? (
              <div key={`${entry.role}-${index}`} className="ml-auto max-w-[80%] rounded-[1.6rem] bg-white px-4 py-3 text-black">
                {entry.content}
              </div>
            ) : (
              <div key={`${entry.role}-${index}`} className="surface-card grid gap-4 rounded-[1.75rem] p-5">
                <div>
                  <p className="text-sm text-white/72">{entry.content.summary}</p>
                  {entry.content.verificationWarning ? (
                    <p className="mt-3 rounded-2xl border border-accent/35 bg-accent/10 px-3 py-2 text-sm text-accentDark">
                      {entry.content.verificationWarning}
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-3">
                  {entry.content.recommendedServices.map((recommendation) => {
                    const match = services.find((service) => service.id === recommendation.serviceId);
                    if (!match) {
                      return null;
                    }
                    return (
                      <div key={recommendation.serviceId} className="surface-subtle rounded-3xl p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold">{match.name}</p>
                            <p className="mt-1 text-sm text-white/60">{recommendation.reason}</p>
                          </div>
                          <Link href={`/services/${match.id}?${locationParams}`} className="text-sm font-medium text-accentDark">
                            View
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">Suggested next steps</p>
                  <ul className="mt-3 grid gap-2 text-sm text-white/65">
                    {entry.content.nextSteps.map((step) => (
                      <li key={step}>• {step}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          )}
        </div>

        <form
          className="mt-6 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(input);
          }}
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={4}
            className="input-surface rounded-3xl px-5 py-4 outline-none transition"
            placeholder="Ask about food, showers, clinics, or a specific service."
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary rounded-full px-5 py-3 font-medium disabled:opacity-60"
          >
            {loading ? "Thinking..." : "Ask grounded chat"}
          </button>
        </form>
      </section>

      <section className="grid gap-4">
        <div className="glass-panel rounded-4xl p-6 shadow-card">
          <p className="text-xs uppercase tracking-[0.22em] text-white/45">Current context</p>
          <h2 className="font-display text-2xl font-semibold">{location.label}</h2>
          <p className="mt-3 text-sm text-white/60">
            {services.length} services loaded. Chat only reasons over this set.
          </p>
          {contextPayload?.warnings[0] ? (
            <p className="mt-3 text-sm text-amber-800">{contextPayload.warnings[0]}</p>
          ) : null}
        </div>
        {services.slice(0, 4).map((service) => (
          <ServiceCard key={service.id} service={service} locationParams={locationParams} />
        ))}
      </section>
    </div>
  );
}
