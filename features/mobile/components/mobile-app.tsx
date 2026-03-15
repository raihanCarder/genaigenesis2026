"use client";

import Link from "next/link";
import {
  Compass,
  Heart,
  LoaderCircle,
  MapPin,
  MessageSquareText,
  ShieldAlert
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { SignInButton } from "@/components/sign-in-button";
import { BouncingDots } from "@/components/ui/bouncing-dots";
import { fetchJson } from "@/lib/api/fetch-json";
import { categoryOrder } from "@/lib/constants/categories";
import { buildLocationSearchParams } from "@/lib/location";
import { rankServices } from "@/lib/services/ranking";
import {
  ChatResponseSchema,
  ServiceWithMetaSchema,
  type ChatResponse,
  type LocationContext,
  type ServiceCategory,
  type ServiceWithMeta,
  type SessionUser
} from "@/lib/types";
import { cn, formatCategoryLabel } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import { useDashboardServices } from "@/features/dashboard/hooks/use-dashboard-services";
import { MobileServiceCard } from "@/features/mobile/components/mobile-service-card";

const mobilePromptChips = [
  "Food tonight",
  "Closest open place",
  "Where can I shower?"
];

type MobileTab = "discover" | "chat" | "saved";
type ChatEntry =
  | { role: "user"; content: string }
  | { role: "assistant"; content: ChatResponse };

function MobileSurface({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.65rem] border border-black/8 bg-white p-4 shadow-[0_16px_34px_rgba(0,0,0,0.07)]",
        className
      )}
    >
      {children}
    </section>
  );
}

function MobileServiceSkeleton() {
  return (
    <MobileSurface>
      <div className="animate-pulse space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-7 w-36 rounded-full bg-black/[0.06]" />
            <div className="h-5 w-3/4 rounded-full bg-black/[0.08]" />
          </div>
          <div className="h-9 w-9 rounded-full bg-black/[0.06]" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full rounded-full bg-black/[0.05]" />
          <div className="h-4 w-5/6 rounded-full bg-black/[0.05]" />
          <div className="h-4 w-2/3 rounded-full bg-black/[0.05]" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-10 rounded-full bg-black/[0.06]" />
          <div className="h-10 rounded-full bg-black/[0.05]" />
        </div>
      </div>
    </MobileSurface>
  );
}

function MobileTabButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: typeof Compass;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-[1rem] px-3 py-3 text-sm font-medium transition",
        active ? "bg-[#111111] text-white" : "text-black/56"
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2.1} />
      <span>{label}</span>
    </button>
  );
}

function MobileDiscoverScreen({
  error,
  loading,
  services,
  locationParams,
  selectedCategory,
  setSelectedCategory,
  warnings
}: {
  error: string | null;
  loading: boolean;
  services: ServiceWithMeta[];
  locationParams: string;
  selectedCategory: ServiceCategory | null;
  setSelectedCategory: (category: ServiceCategory | null) => void;
  warnings: string[];
}) {
  const categories = useMemo(
    () => categoryOrder.filter((category) => services.some((service) => service.category === category)),
    [services]
  );
  const visibleServices = useMemo(
    () =>
      selectedCategory
        ? services.filter((service) => service.category === selectedCategory)
        : services,
    [selectedCategory, services]
  );
  const rankedServices = useMemo(() => rankServices(visibleServices, true).slice(0, 8), [visibleServices]);

  return (
    <div className="space-y-3">
      {warnings[0] ? (
        <section className="rounded-[1.45rem] bg-[#fff4e4] px-4 py-3 text-[#6a4017]">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-sm leading-5">
              {warnings[0]}
              {warnings.length > 1 ? ` + ${warnings.length - 1} more` : ""}
            </p>
          </div>
        </section>
      ) : null}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <button
          type="button"
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
            selectedCategory === null ? "bg-[#111111] text-white" : "bg-black/[0.05] text-black/58"
          )}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
              selectedCategory === category ? "bg-[#111111] text-white" : "bg-black/[0.05] text-black/58"
            )}
          >
            {formatCategoryLabel(category)}
          </button>
        ))}
      </div>

      {error ? (
        <section className="rounded-[1.45rem] border border-[#efc4c4] bg-[#fff1f1] p-4 text-sm text-[#822f2f]">
          {error}
        </section>
      ) : null}

      {loading && services.length === 0 ? (
        <div className="space-y-3">
          <MobileServiceSkeleton />
          <MobileServiceSkeleton />
          <MobileServiceSkeleton />
        </div>
      ) : null}

      {!loading && rankedServices.length === 0 ? (
        <MobileSurface className="text-sm leading-6 text-black/58">
          No matches in this category. Try switching back to all results.
        </MobileSurface>
      ) : null}

      <div className="space-y-3">
        {rankedServices.map((service) => (
          <MobileServiceCard key={service.id} service={service} locationParams={locationParams} />
        ))}
      </div>
    </div>
  );
}

function MobileChatScreen({
  contextError,
  location,
  payload,
  selectedCategory
}: {
  contextError: string | null;
  location: LocationContext;
  payload: {
    services: ServiceWithMeta[];
    warnings: string[];
  } | null;
  selectedCategory: ServiceCategory | null;
}) {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    setEntries([]);
    setInput("");
    setChatError(null);
  }, [location.latitude, location.longitude, location.label, selectedCategory]);

  const assistantResponse = entries.find((entry) => entry.role === "assistant")?.content ?? null;
  const locationParams = buildLocationSearchParams(
    location,
    selectedCategory ? { category: selectedCategory } : undefined
  );
  const matchedRecommendations = useMemo(() => {
    if (!assistantResponse || !payload) {
      return [];
    }

    const serviceLookup = new Map(payload.services.map((service) => [service.id, service]));
    return assistantResponse.recommendedServices.flatMap((recommendation) => {
      const service = serviceLookup.get(recommendation.serviceId);
      return service ? [{ service, reason: recommendation.reason }] : [];
    });
  }, [assistantResponse, payload]);

  async function sendMessage(rawMessage?: string) {
    const message = (rawMessage ?? input).trim();
    if (!message || loading || !payload) {
      return;
    }

    setLoading(true);
    setChatError(null);
    setEntries([{ role: "user", content: message }]);
    setInput("");

    try {
      const response = await fetchJson<unknown>("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message,
          location,
          selectedCategory: selectedCategory ?? undefined,
          services: payload.services,
          warnings: payload.warnings
        })
      });

      setEntries([
        { role: "user", content: message },
        { role: "assistant", content: ChatResponseSchema.parse(response) }
      ]);
    } catch {
      setChatError("Beacon could not answer right now.");
      setInput(message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  return (
    <div className="space-y-3">
      <MobileSurface className="p-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {mobilePromptChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setInput(chip)}
              className="shrink-0 rounded-full bg-black/[0.05] px-3 py-2 text-sm text-black/58"
            >
              {chip}
            </button>
          ))}
        </div>
      </MobileSurface>

      {contextError ? (
        <section className="rounded-[1.45rem] border border-[#efc4c4] bg-[#fff1f1] p-4 text-sm text-[#822f2f]">
          {contextError}
        </section>
      ) : null}

      {!payload ? (
        <MobileSurface className="text-sm text-black/56">
          <BouncingDots
            message="Loading nearby context"
            messagePlacement="right"
            className="bg-accentDark"
          />
        </MobileSurface>
      ) : null}

      {entries.length === 0 && payload ? (
        <MobileSurface className="text-sm leading-6 text-black/58">
          Ask about food, shelters, clinics, or one specific place nearby.
        </MobileSurface>
      ) : null}

      {entries.map((entry, index) =>
        entry.role === "user" ? (
          <section key={`user-${index}`} className="flex justify-end">
            <div className="max-w-[84%] rounded-[1.35rem] rounded-br-md bg-[#111111] px-4 py-3 text-sm leading-6 text-white">
              {entry.content}
            </div>
          </section>
        ) : (
          <MobileSurface key={`assistant-${index}`}>
            <p className="text-sm leading-6 text-black/74">{entry.content.summary}</p>

            {entry.content.intent === "relevant" && matchedRecommendations.length > 0 ? (
              <div className="mt-4 space-y-3">
                {matchedRecommendations.map(({ service, reason }) => (
                  <MobileServiceCard
                    key={service.id}
                    service={service}
                    locationParams={locationParams}
                    note={reason}
                    preferDirections={matchedRecommendations.length === 1}
                  />
                ))}
              </div>
            ) : null}

            {entry.content.intent === "relevant" && entry.content.nextSteps.length > 0 ? (
              <div className="mt-4 rounded-[1.25rem] bg-[#f4efe8] px-4 py-3">
                <ul className="space-y-2 text-sm leading-6 text-black/62">
                  {entry.content.nextSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </MobileSurface>
        )
      )}

      {loading ? (
        <MobileSurface className="text-sm text-black/56">
          <div className="flex items-center gap-2">
            <LoaderCircle className="h-4 w-4 animate-spin text-accentDark" />
            Finding the best option...
          </div>
        </MobileSurface>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-2">
        {chatError ? (
          <div className="rounded-[1.45rem] border border-[#efc4c4] bg-[#fff1f1] px-4 py-3 text-sm text-[#822f2f]">
            {chatError}
          </div>
        ) : null}
        <MobileSurface className="p-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={3}
            placeholder="Ask Beacon"
            className="min-h-[5.2rem] w-full resize-none bg-transparent px-1 text-sm leading-6 text-black outline-none placeholder:text-black/32"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={loading || !payload || input.trim().length === 0}
              className="btn-primary rounded-full px-4 py-2 text-sm font-medium"
            >
              Send
            </button>
          </div>
        </MobileSurface>
      </form>
    </div>
  );
}

function MobileSavedScreen({
  active,
  location,
  user
}: {
  active: boolean;
  location: LocationContext;
  user: SessionUser | null;
}) {
  const favoriteServiceIds = useAppStore((state) => state.favoriteServiceIds);
  const favoritesReady = useAppStore((state) => state.favoritesReady);
  const setFavoriteServiceIds = useAppStore((state) => state.setFavoriteServiceIds);
  const setFavoritesReady = useAppStore((state) => state.setFavoritesReady);
  const [favorites, setFavorites] = useState<ServiceWithMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !user) {
      return;
    }

    let cancelled = false;

    async function loadFavorites() {
      setLoading(true);
      setError(null);

      try {
        const payload = await fetchJson<unknown>("/api/favorites", { cache: "no-store" });
        const parsed = ServiceWithMetaSchema.array().parse(payload);

        if (cancelled) {
          return;
        }

        setFavorites(parsed);
        setFavoriteServiceIds(parsed.map((service) => service.id));
        setFavoritesReady(true);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load saved services.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [active, setFavoriteServiceIds, setFavoritesReady, user]);

  useEffect(() => {
    if (!user) {
      setFavorites([]);
      setError(null);
      setLoading(false);
    }
  }, [user]);

  const locationParams = buildLocationSearchParams(location);
  const visibleFavorites = favoritesReady
    ? favorites.filter((service) => favoriteServiceIds.includes(service.id))
    : favorites;

  if (!user) {
    return (
      <MobileSurface>
        <h2 className="font-display text-2xl font-semibold text-black">Saved places</h2>
        <p className="mt-2 text-sm leading-6 text-black/58">
          Sign in to keep important services close.
        </p>
        <div className="mt-4 w-fit">
          <SignInButton />
        </div>
      </MobileSurface>
    );
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="space-y-3">
          <MobileSurface className="text-sm text-black/56">
            <BouncingDots
              message="Loading saved services"
              messagePlacement="right"
              className="bg-accentDark"
            />
          </MobileSurface>
          <MobileServiceSkeleton />
          <MobileServiceSkeleton />
        </div>
      ) : null}

      {error ? (
        <section className="rounded-[1.45rem] border border-[#efc4c4] bg-[#fff1f1] p-4 text-sm text-[#822f2f]">
          {error}
        </section>
      ) : null}

      {!loading && visibleFavorites.length === 0 ? (
        <MobileSurface className="text-sm leading-6 text-black/58">
          No saved services yet.
        </MobileSurface>
      ) : null}

      <div className="space-y-3">
        {visibleFavorites.map((service) => (
          <MobileServiceCard key={service.id} service={service} locationParams={locationParams} />
        ))}
      </div>
    </div>
  );
}

export function MobileApp({ initialLocation }: { initialLocation: LocationContext }) {
  const user = useAppStore((state) => state.user);
  const setLocation = useAppStore((state) => state.setLocation);
  const setServices = useAppStore((state) => state.setServices);
  const { payload, services, location, warnings, loading, error } = useDashboardServices(initialLocation);
  const [activeTab, setActiveTab] = useState<MobileTab>("discover");
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);

  useEffect(() => {
    setLocation(location);
    setServices(services);
  }, [location, services, setLocation, setServices]);

  useEffect(() => {
    setSelectedCategory(null);
  }, [location.latitude, location.longitude, location.label]);

  const locationParams = buildLocationSearchParams(
    location,
    selectedCategory ? { category: selectedCategory } : undefined
  );
  const resultCopy = loading && services.length === 0 ? "Loading nearby services" : `${services.length} nearby`;

  return (
    <div className="mx-auto w-full max-w-[28rem] px-4 pb-8 md:px-6">
      <div className="space-y-4">
        <section className="rounded-[1.9rem] bg-[#111111] px-5 py-4 text-white shadow-[0_20px_48px_rgba(0,0,0,0.2)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-white/38">
                <MapPin className="h-3.5 w-3.5" />
                Beacon mobile
              </div>
              <h1 className="mt-2 font-display text-[1.8rem] font-semibold leading-tight text-white">
                {location.label}
              </h1>
              <p className="mt-1 text-sm text-white/56">{resultCopy}</p>
            </div>
            <Link
              href="/"
              className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-medium text-white/70"
            >
              Change
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-3 gap-2 rounded-[1.25rem] bg-black/[0.05] p-1.5">
          <MobileTabButton
            active={activeTab === "discover"}
            icon={Compass}
            label="Discover"
            onClick={() => setActiveTab("discover")}
          />
          <MobileTabButton
            active={activeTab === "chat"}
            icon={MessageSquareText}
            label="Chat"
            onClick={() => setActiveTab("chat")}
          />
          <MobileTabButton
            active={activeTab === "saved"}
            icon={Heart}
            label="Saved"
            onClick={() => setActiveTab("saved")}
          />
        </div>

        {activeTab === "discover" ? (
          <MobileDiscoverScreen
            error={error}
            loading={loading}
            services={services}
            locationParams={locationParams}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            warnings={warnings}
          />
        ) : null}

        {activeTab === "chat" ? (
          <MobileChatScreen
            contextError={error}
            location={location}
            payload={payload ? { services: payload.services, warnings: payload.warnings } : null}
            selectedCategory={selectedCategory}
          />
        ) : null}

        {activeTab === "saved" ? (
          <MobileSavedScreen active={activeTab === "saved"} location={location} user={user} />
        ) : null}
      </div>
    </div>
  );
}
