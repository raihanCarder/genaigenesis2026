"use client";

import Link from "next/link";
import { Bot, Compass, LoaderCircle, MapPin, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchDashboardPayload } from "@/features/dashboard/api/dashboard-api";
import { fetchJson } from "@/lib/api/fetch-json";
import { buildLocationSearchParams } from "@/lib/location";
import {
  ChatResponseSchema,
  type ChatResponse,
  type DashboardPayload,
  type LocationContext,
  type ServiceCategory,
  type ServiceWithMeta,
  type SessionUser
} from "@/lib/types";
import { cn, formatCategoryLabel, formatDistance } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

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
  const user = useAppStore((state) => state.user);
  const setServices = useAppStore((state) => state.setServices);
  const setLocation = useAppStore((state) => state.setLocation);
  const location = initialLocation;
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextPayload, setContextPayload] = useState<DashboardPayload | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocation(location);
  }, [location, setLocation]);

  useEffect(() => {
    setEntries([]);
    setChatError(null);
  }, [location.latitude, location.longitude, location.label]);

  useEffect(() => {
    let cancelled = false;

    setContextLoading(true);
    setContextError(null);

    void fetchDashboardPayload(location, { preferCache: true })
      .then((payload) => {
        if (cancelled) {
          return;
        }
        setContextPayload(payload);
        setServices(payload.services);
        setLocation(payload.location);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setContextError("Could not refresh nearby services. Chat will use the last loaded context.");
      })
      .finally(() => {
        if (!cancelled) {
          setContextLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [location, location.latitude, location.longitude, setLocation, setServices]);

  useEffect(() => {
    const container = conversationRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [entries, loading]);

  const locationParams = buildLocationSearchParams(location, {
    category: initialSelectedCategory
  });

  const visibleServices = services.slice(0, 12);
  const contextReady = !contextLoading || services.length > 0;

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message || loading || !contextReady) {
      return;
    }

    setLoading(true);
    setChatError(null);
    setEntries([{ role: "user", content: message }]);
    setInput("");

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
      setEntries([
        { role: "user", content: message },
        { role: "assistant", content: ChatResponseSchema.parse(payload) }
      ]);
    } catch {
      setChatError("Grounded chat is temporarily unavailable. Try sending that again.");
      setInput(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid h-full max-w-6xl gap-4 px-4 md:px-6 xl:grid-cols-[minmax(0,1.45fr)_18.5rem]">
      <section className="surface-card flex h-full min-h-0 flex-col overflow-hidden rounded-[1.75rem] shadow-card">
        <div className="flex h-full min-h-[38rem] flex-col md:min-h-0">
          <div className="border-b border-white/10 px-4 py-4 sm:px-5">
            <p className="text-xs uppercase tracking-[0.24em] text-white/42">Grounded chat</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-[1.55rem] font-semibold tracking-tight sm:text-[1.8rem]">
                Message Beacon
              </h1>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/68">
                {location.label}
              </span>
            </div>
            <p className="mt-2.5 max-w-2xl text-sm leading-5 text-white/58">
              Each prompt resets the grounded reply and uses only the current nearby results.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {promptChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    void sendMessage(chip);
                  }}
                  disabled={!contextReady || loading}
                  className="btn-secondary rounded-full px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={conversationRef}
            className="chat-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#050505] px-4 py-4 sm:px-5"
          >
            {entries.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.02] px-4 py-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-accent/15 bg-accent/8 text-accentDark">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-display text-xl font-semibold text-white">Start the conversation</p>
                    <p className="mt-1.5 max-w-xl text-sm leading-5 text-white/58">
                      Ask about food, shelters, clinics, or a specific service.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {entries.map((entry, index) => (
              <div
                key={`${entry.role}-${index}`}
                className={cn(
                  "flex items-end gap-3",
                  entry.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <ChatAvatar role={entry.role} user={user} />
                <div
                  className={cn(
                    "max-w-[min(100%,38rem)]",
                    entry.role === "user" ? "order-first text-right" : "text-left"
                  )}
                >
                  <p className="mb-1.5 px-1 text-[10px] uppercase tracking-[0.2em] text-white/36">
                    {entry.role === "user" ? "You" : "Beacon AI"}
                  </p>
                  {entry.role === "user" ? (
                    <div className="rounded-[1.45rem] rounded-br-md border border-[#ece3d6] bg-[#f4efe7] px-4 py-3 text-sm leading-6 text-[#141110]">
                      {entry.content}
                    </div>
                  ) : (
                    <AssistantReplyCard
                      response={entry.content}
                      services={services}
                      locationParams={locationParams}
                    />
                  )}
                </div>
              </div>
            ))}

            {loading ? (
              <div className="flex items-end gap-3">
                <ChatAvatar role="assistant" user={user} />
                <div className="max-w-[16rem]">
                  <p className="mb-1.5 px-1 text-[10px] uppercase tracking-[0.2em] text-white/36">
                    Beacon AI
                  </p>
                  <div className="surface-card flex items-center gap-2.5 rounded-[1.45rem] rounded-bl-md px-4 py-3">
                    <LoaderCircle className="h-4 w-4 animate-spin text-accentDark" />
                    <p className="text-sm text-white/62">Finding the best nearby option...</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-white/10 bg-[#090909] px-4 py-3 sm:px-5">
            {chatError ? (
              <div className="error-panel mb-2 rounded-[1.1rem] px-3 py-2 text-sm">{chatError}</div>
            ) : null}
            {contextError ? (
              <div className="error-panel mb-2 rounded-[1.1rem] px-3 py-2 text-sm">{contextError}</div>
            ) : null}
            <form
              className="space-y-2"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(input);
              }}
            >
              <div className="rounded-[1.45rem] border border-white/10 bg-[#0f0f0f] p-2 transition focus-within:border-accent/40">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage(input);
                    }
                  }}
                  rows={3}
                  className="min-h-[4.75rem] w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-6 text-white outline-none placeholder:text-white/32"
                  placeholder="Ask about food, showers, clinics, or a specific service."
                />
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/8 px-2.5 pb-1 pt-2.5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/38">
                    {contextReady
                      ? `Grounded on ${visibleServices.length} nearby services`
                      : "Loading nearby context"}
                  </p>
                  <button
                    type="submit"
                    disabled={loading || !contextReady || input.trim().length === 0}
                    className="inline-flex items-center gap-2 rounded-full bg-[#f4efe7] px-3 py-2 text-xs font-medium text-[#13100f] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {loading ? "Thinking..." : "Send message"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      <aside className="grid min-h-0 content-start gap-3 xl:grid-rows-[auto_minmax(0,1fr)]">
        <div className="surface-card rounded-[1.75rem] p-4 shadow-card">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-accent/15 bg-accent/8 text-accentDark">
              <Compass className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/42">Search context</p>
              <h2 className="mt-1.5 font-display text-xl font-semibold">{location.label}</h2>
            </div>
          </div>
          <div className="mt-4 grid gap-2.5">
            <div className="surface-subtle rounded-[1.2rem] p-3.5">
              <p className="text-xs uppercase tracking-[0.18em] text-white/38">Services loaded</p>
              <p className="mt-1.5 text-xl font-semibold text-white">{services.length}</p>
              <p className="mt-1 text-sm leading-5 text-white/55">Only this result set is used for replies.</p>
            </div>
            {contextPayload?.warnings[0] ? (
              <div className="rounded-[1.2rem] border border-accent/25 bg-accent/10 p-3.5 text-sm leading-5 text-accentDark">
                {contextPayload.warnings[0]}
              </div>
            ) : null}
            <div className="surface-subtle rounded-[1.2rem] p-3.5">
              <p className="text-xs uppercase tracking-[0.18em] text-white/38">How Beacon answers</p>
              <div className="mt-2.5 grid gap-2.5 text-sm text-white/62">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accentDark" />
                  <span>Uses only loaded services.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accentDark" />
                  <span>Keeps advice tied to this location.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="surface-card flex min-h-0 flex-col overflow-hidden rounded-[1.75rem] p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/42">In this result set</p>
              <h2 className="mt-1.5 font-display text-xl font-semibold">Nearby options</h2>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/45">
              Top {Math.min(4, services.length)}
            </span>
          </div>
          <div className="chat-scrollbar mt-4 grid min-h-0 gap-2.5 overflow-y-auto pr-1">
            {services.slice(0, 4).map((service) => (
              <Link
                key={service.id}
                href={`/services/${service.id}?${locationParams}`}
                className="surface-subtle block rounded-[1.2rem] p-3.5 transition hover:border-white/18 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.68rem] uppercase tracking-[0.2em] text-white/36">
                      {formatCategoryLabel(service.category)}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-white">{service.name}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accentDark">
                    {formatDistance(service.distanceMeters)}
                  </span>
                </div>
                <p className="text-clamp-2 mt-2 text-sm leading-5 text-white/58">
                  {service.description ?? service.address}
                </p>
              </Link>
            ))}
            {services.length === 0 && !contextLoading ? (
              <div className="surface-subtle rounded-[1.2rem] p-3.5 text-sm text-white/55">
                No services loaded for this location yet.
              </div>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

function ChatAvatar({
  role,
  user
}: {
  role: ChatEntry["role"];
  user: SessionUser | null;
}) {
  if (role === "assistant") {
    return (
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-accent/20 bg-[#13110f] text-accentDark">
        <Bot className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Beacon AI</span>
      </div>
    );
  }

  const avatarName = user?.displayName ?? user?.email ?? "You";
  const avatarInitial = avatarName.trim().charAt(0).toUpperCase() || "Y";

  if (user?.photoURL) {
    return (
      <img
        src={user.photoURL}
        alt={`${avatarName} avatar`}
        className="h-10 w-10 shrink-0 rounded-2xl border border-white/25 object-cover"
      />
    );
  }

  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/65 bg-[#f4efe7] text-sm font-semibold text-[#141110]">
      {avatarInitial}
    </div>
  );
}

function AssistantReplyCard({
  response,
  services,
  locationParams
}: {
  response: ChatResponse;
  services: ServiceWithMeta[];
  locationParams: string;
}) {
  return (
    <div className="surface-card overflow-hidden rounded-[1.45rem] rounded-bl-md border border-white/10">
      <div className="border-b border-white/8 px-4 py-3">
        <p className="text-sm leading-6 text-white/78">{response.summary}</p>
        {response.verificationWarning ? (
          <div className="mt-3 rounded-[1rem] border border-accent/28 bg-accent/10 px-3 py-2.5 text-sm leading-5 text-accentDark">
            {response.verificationWarning}
          </div>
        ) : null}
      </div>

      {response.recommendedServices.length > 0 ? (
        <div className="grid gap-2.5 px-3 py-3 sm:px-4">
          {response.recommendedServices.map((recommendation) => {
            const match = services.find((service) => service.id === recommendation.serviceId);
            if (!match) {
              return null;
            }

            return (
              <div
                key={recommendation.serviceId}
                className="surface-subtle rounded-[1.1rem] p-3 transition hover:border-white/16 hover:bg-white/[0.04]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[0.68rem] uppercase tracking-[0.2em] text-white/36">
                      {formatCategoryLabel(match.category)}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold text-white">{match.name}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accentDark">
                    {formatDistance(match.distanceMeters)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-5 text-white/58">{recommendation.reason}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="truncate text-xs uppercase tracking-[0.18em] text-white/34">
                    {match.address}
                  </p>
                  <Link
                    href={`/services/${match.id}?${locationParams}`}
                    className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-medium text-white transition hover:border-white/22 hover:bg-white/[0.05]"
                  >
                    View details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {response.nextSteps.length > 0 ? (
        <div className="border-t border-white/8 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/38">Suggested next steps</p>
          <div className="mt-2.5 grid gap-2">
            {response.nextSteps.map((step, index) => (
              <div key={step} className="flex items-start gap-2.5 text-sm leading-5 text-white/62">
                <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/8 text-[10px] font-semibold text-white/72">
                  {index + 1}
                </div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
