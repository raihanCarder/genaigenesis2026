"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/api/fetch-json";
import { buildLocationSearchParams } from "@/lib/location";
import {
  ChatResponseSchema,
  ServiceWithMetaSchema,
  type ChatResponse,
  type LocationContext,
  type ServiceCategory,
  type ServiceWithMeta
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

const ChatServicesResponseSchema = ServiceWithMetaSchema.array();

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

  useEffect(() => {
    setLocation(initialLocation);
  }, [initialLocation, setLocation]);

  useEffect(() => {
    if (services.length > 0) {
      return;
    }
    const params = new URLSearchParams({
      lat: initialLocation.latitude.toString(),
      lng: initialLocation.longitude.toString(),
      radius: "6000"
    });
    void fetchJson<unknown>(`/api/services?${params.toString()}`)
      .then((payload) => ChatServicesResponseSchema.parse(payload))
      .then((payload: ServiceWithMeta[]) => setServices(payload));
  }, [initialLocation.latitude, initialLocation.longitude, services.length, setServices]);

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
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 md:grid-cols-[1.1fr,0.9fr] md:px-6">
      <section className="glass-panel rounded-4xl p-6 shadow-card">
        <p className="text-xs uppercase tracking-[0.22em] text-black/45">Grounded chat</p>
        <h1 className="font-display text-3xl font-semibold">Ask about nearby support</h1>
        <p className="mt-3 text-black/65">
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
              className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm transition hover:border-accent/30 hover:bg-accent/5"
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4">
          {entries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/10 p-5 text-sm text-black/55">
              No messages yet. Use a prompt chip or ask your own question.
            </div>
          ) : null}
          {entries.map((entry, index) =>
            entry.role === "user" ? (
              <div key={`${entry.role}-${index}`} className="ml-auto max-w-[80%] rounded-[1.6rem] bg-ink px-4 py-3 text-white">
                {entry.content}
              </div>
            ) : (
              <div key={`${entry.role}-${index}`} className="grid gap-4 rounded-[1.75rem] border border-black/5 bg-white p-5">
                <div>
                  <p className="text-sm text-black/72">{entry.content.summary}</p>
                  {entry.content.verificationWarning ? (
                    <p className="mt-3 rounded-2xl bg-accent/10 px-3 py-2 text-sm text-accentDark">
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
                      <div key={recommendation.serviceId} className="rounded-3xl border border-black/5 bg-[#fbf7f1] p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold">{match.name}</p>
                            <p className="mt-1 text-sm text-black/60">{recommendation.reason}</p>
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
                  <p className="text-xs uppercase tracking-[0.22em] text-black/45">Suggested next steps</p>
                  <ul className="mt-3 grid gap-2 text-sm text-black/65">
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
            className="rounded-3xl border border-black/10 bg-white px-5 py-4 outline-none transition focus:border-accent"
            placeholder="Ask about food, showers, clinics, or a specific service."
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-ink px-5 py-3 font-medium text-white transition hover:bg-accentDark disabled:opacity-60"
          >
            {loading ? "Thinking..." : "Ask grounded chat"}
          </button>
        </form>
      </section>

      <section className="grid gap-4">
        <div className="glass-panel rounded-4xl p-6 shadow-card">
          <p className="text-xs uppercase tracking-[0.22em] text-black/45">Current context</p>
          <h2 className="font-display text-2xl font-semibold">{location.label}</h2>
          <p className="mt-3 text-sm text-black/60">
            {services.length} services loaded. Chat only reasons over this set.
          </p>
        </div>
        {services.slice(0, 4).map((service) => (
          <ServiceCard key={service.id} service={service} locationParams={locationParams} />
        ))}
      </section>
    </div>
  );
}
