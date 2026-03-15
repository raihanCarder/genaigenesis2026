"use client";

import Link from "next/link";
import { Bot, Compass, LoaderCircle, MapPin, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  fetchDashboardPayload,
  getCachedDashboardPayload
} from "@/features/dashboard/api/dashboard-api";
import { fetchJson } from "@/lib/api/fetch-json";
import { buildDirectionsUrl } from "@/lib/adapters/google-maps";
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
  const user = useAppStore((state) => state.user);
  const setServices = useAppStore((state) => state.setServices);
  const setLocation = useAppStore((state) => state.setLocation);
  const location = initialLocation;
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [cachedContextPayload, setCachedContextPayload] = useState<DashboardPayload | null>(null);
  const [contextPayload, setContextPayload] = useState<DashboardPayload | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setLocation(location);
  }, [location, setLocation]);

  useEffect(() => {
    setEntries([]);
    setChatError(null);
    setContextPayload(null);
    setCachedContextPayload(getCachedDashboardPayload(location));
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

  const effectiveContextPayload = contextPayload ?? cachedContextPayload;
  const activeLocation = effectiveContextPayload?.location ?? location;
  const activeServices = effectiveContextPayload?.services ?? [];
  const activeWarnings = effectiveContextPayload?.warnings ?? [];
  const locationParams = buildLocationSearchParams(activeLocation, {
    category: initialSelectedCategory
  });
  const contextReady = Boolean(effectiveContextPayload);

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message || loading || !contextReady || !effectiveContextPayload) {
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
          location: effectiveContextPayload.location,
          selectedCategory: initialSelectedCategory,
          services: effectiveContextPayload.services,
          warnings: effectiveContextPayload.warnings
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
          <div className="border-b border-[color:var(--line)] px-4 py-4 sm:px-5">
            <p className="text-theme-faint text-xs uppercase tracking-[0.24em]">Grounded chat</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-[1.55rem] font-semibold tracking-tight sm:text-[1.8rem]">
                Message Beacon
              </h1>
            </div>
            <p className="text-theme-subtle mt-2.5 max-w-2xl text-sm leading-5">
              Each prompt resets the grounded reply and uses the full current nearby results.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {promptChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setInput(chip);
                    textareaRef.current?.focus();
                  }}
                  disabled={loading}
                  className="btn-secondary rounded-full px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={conversationRef}
            className="bg-chat-canvas chat-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5"
          >
            {entries.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-[color:var(--line)] bg-[color:var(--surface-subtle)] px-4 py-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-accent/15 bg-accent/8 text-accentDark">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-display text-xl font-semibold">Start the conversation</p>
                    <p className="text-theme-subtle mt-1.5 max-w-xl text-sm leading-5">
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
                  <p className="text-theme-faint mb-1.5 px-1 text-[10px] uppercase tracking-[0.2em]">
                    {entry.role === "user" ? "You" : "Beacon AI"}
                  </p>
                  {entry.role === "user" ? (
                    <div className="chat-user-bubble rounded-[1.45rem] rounded-br-md border px-4 py-3 text-sm leading-6">
                      {entry.content}
                    </div>
                  ) : (
                    <AssistantReplyCard
                      response={entry.content}
                      services={activeServices}
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
                  <p className="text-theme-faint mb-1.5 px-1 text-[10px] uppercase tracking-[0.2em]">
                    Beacon AI
                  </p>
                  <div className="surface-card flex items-center gap-2.5 rounded-[1.45rem] rounded-bl-md px-4 py-3">
                    <LoaderCircle className="h-4 w-4 animate-spin text-accentDark" />
                    <p className="text-theme-subtle text-sm">Finding the best nearby option...</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="bg-chat-footer border-t border-[color:var(--line)] px-4 py-3 sm:px-5">
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
              <div className="bg-chat-input rounded-[1.45rem] border border-[color:var(--line)] p-2 transition focus-within:border-[color:var(--line-strong)] focus-within:bg-[color:var(--surface-subtle)]">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage(input);
                    }
                  }}
                  rows={3}
                  className="min-h-[4.75rem] w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-6 text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-faint)]"
                  placeholder="Ask about food, showers, clinics, or a specific service."
                />
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--line)] px-2.5 pb-1 pt-2.5">
                  <p className="text-theme-faint text-[10px] uppercase tracking-[0.18em]">
                    {contextReady
                      ? `Grounded on ${activeServices.length} nearby services`
                      : "Loading nearby context"}
                  </p>
                  <button
                    type="submit"
                    disabled={loading || !contextReady || input.trim().length === 0}
                    className="btn-primary inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-55"
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
              <p className="text-theme-faint text-xs uppercase tracking-[0.22em]">Search context</p>
              <h2 className="mt-1.5 font-display text-xl font-semibold">{activeLocation.label}</h2>
            </div>
          </div>
          <div className="mt-4 grid gap-2.5">
            <div className="surface-subtle rounded-[1.2rem] p-3.5">
              <p className="text-theme-faint text-xs uppercase tracking-[0.18em]">Services loaded</p>
              <p className="mt-1.5 text-xl font-semibold">{activeServices.length}</p>
              <p className="text-theme-subtle mt-1 text-sm leading-5">Only this result set is used for replies.</p>
            </div>
            {activeWarnings[0] ? (
              <div className="rounded-[1.2rem] border border-accent/25 bg-accent/10 p-3.5 text-sm leading-5 text-accentDark">
                {activeWarnings[0]}
              </div>
            ) : null}
            <div className="surface-subtle rounded-[1.2rem] p-3.5">
              <p className="text-theme-faint text-xs uppercase tracking-[0.18em]">How Beacon answers</p>
              <div className="text-theme-subtle mt-2.5 grid gap-2.5 text-sm">
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
              <h2 className="font-display text-xl font-semibold">Nearby options</h2>
            </div>
            <span className="surface-subtle text-theme-faint rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              Top {Math.min(4, activeServices.length)}
            </span>
          </div>
          <div className="chat-scrollbar mt-4 grid min-h-0 gap-2.5 overflow-y-auto pr-1">
            {activeServices.slice(0, 4).map((service) => (
              <Link
                key={service.id}
                href={`/services/${service.id}?${locationParams}`}
                className="surface-subtle block rounded-[1.2rem] p-3.5 transition hover:border-[color:var(--line-strong)] hover:bg-[color:var(--surface-subtle-hover)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-theme-faint text-[0.68rem] uppercase tracking-[0.2em]">
                      {formatCategoryLabel(service.category)}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold">{service.name}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accentDark">
                    {formatDistance(service.distanceMeters)}
                  </span>
                </div>
                <p className="text-theme-subtle text-clamp-2 mt-2 text-sm leading-5">
                  {service.description ?? service.address}
                </p>
              </Link>
            ))}
            {activeServices.length === 0 && !contextLoading ? (
              <div className="surface-subtle text-theme-subtle rounded-[1.2rem] p-3.5 text-sm">
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
      <div className="surface-subtle grid h-10 w-10 shrink-0 place-items-center rounded-2xl border-accent/20 text-accentDark">
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
        className="h-10 w-10 shrink-0 rounded-2xl border border-[color:var(--line-strong)] object-cover"
      />
    );
  }

  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[color:var(--btn-primary-border)] bg-[color:var(--btn-primary-bg)] text-sm font-semibold text-[color:var(--btn-primary-text)]">
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
  const recommendations = response.recommendedServices.flatMap((recommendation) => {
    const match = services.find((service) => service.id === recommendation.serviceId);
    return match ? [{ recommendation, service: match }] : [];
  });
  const hasSingleResult = recommendations.length === 1;

  return (
    <div className="surface-card overflow-hidden rounded-[1.45rem] rounded-bl-md border border-[color:var(--line)]">
      <div className="border-b border-[color:var(--line)] px-4 py-3">
        <p className="text-theme-muted text-sm leading-6">{response.summary}</p>
        {response.verificationWarning ? (
          <div className="mt-3 rounded-[1rem] border border-accent/28 bg-accent/10 px-3 py-2.5 text-sm leading-5 text-accentDark">
            {response.verificationWarning}
          </div>
        ) : null}
      </div>

      {recommendations.length > 0 ? (
        <div className="grid gap-2.5 px-3 py-3 sm:px-4">
          {recommendations.map(({ recommendation, service }) => (
            <div
              key={recommendation.serviceId}
              className="surface-subtle rounded-[1.1rem] p-3 transition hover:border-[color:var(--line-strong)] hover:bg-[color:var(--surface-subtle-hover)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-theme-faint text-[0.68rem] uppercase tracking-[0.2em]">
                    {formatCategoryLabel(service.category)}
                  </p>
                  <p className="mt-1.5 text-sm font-semibold">{service.name}</p>
                </div>
                <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accentDark">
                  {formatDistance(service.distanceMeters)}
                </span>
              </div>
              <p className="text-theme-subtle mt-2 text-sm leading-5">{recommendation.reason}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-theme-faint truncate text-xs uppercase tracking-[0.18em]">
                  {service.address}
                </p>
                {hasSingleResult ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={buildDirectionsUrl(service)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary rounded-full px-3 py-1.5 text-xs font-medium"
                    >
                      Directions
                    </a>
                    <Link
                      href={`/services/${service.id}?${locationParams}`}
                      className="btn-secondary rounded-full px-3 py-1.5 text-xs font-medium"
                    >
                      View details
                    </Link>
                  </div>
                ) : (
                  <Link
                    href={`/services/${service.id}?${locationParams}`}
                    className="btn-secondary rounded-full px-3 py-1.5 text-xs font-medium"
                  >
                    View details
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {response.intent !== "irrelevant" && response.nextSteps.length > 0 ? (
        <div className="border-t border-[color:var(--line)] px-4 py-3">
          <p className="text-theme-faint text-xs uppercase tracking-[0.2em]">Suggested next steps</p>
          <div className="mt-2.5 grid gap-2">
            {response.nextSteps.map((step, index) => (
              <div key={step} className="text-theme-subtle flex items-start gap-2.5 text-sm leading-5">
                <div className="surface-subtle text-theme-soft mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold">
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
