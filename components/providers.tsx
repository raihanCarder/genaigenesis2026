"use client";

import { startTransition, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { fetchJson } from "@/lib/api/fetch-json";
import { ServiceWithMetaSchema } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapSupabaseUser } from "@/lib/adapters/supabase-client";
import { useAppStore } from "@/store/app-store";

async function loadFavoriteServiceIds() {
  const payload = await fetchJson<unknown>("/api/favorites", {
    cache: "no-store"
  });
  return ServiceWithMetaSchema.array()
    .parse(payload)
    .map((service) => service.id);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const setUser = useAppStore((state) => state.setUser);
  const setAuthReady = useAppStore((state) => state.setAuthReady);
  const setFavoriteServiceIds = useAppStore((state) => state.setFavoriteServiceIds);
  const setFavoritesReady = useAppStore((state) => state.setFavoritesReady);
  const resetFavorites = useAppStore((state) => state.resetFavorites);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      resetFavorites();
      setAuthReady(true);
      return;
    }
    let active = true;
    let sessionRequestId = 0;

    async function applySessionUser(user: User | null) {
      const requestId = ++sessionRequestId;
      if (!active) {
        return;
      }

      if (!user) {
        startTransition(() => {
          setUser(null);
          resetFavorites();
          setAuthReady(true);
        });
        return;
      }

      startTransition(() => {
        setUser(mapSupabaseUser(user));
        setFavoritesReady(false);
        setAuthReady(true);
      });

      try {
        const favoriteIds = await loadFavoriteServiceIds();
        if (!active || requestId !== sessionRequestId) {
          return;
        }
        startTransition(() => {
          setFavoriteServiceIds(favoriteIds);
          setFavoritesReady(true);
        });
      } catch {
        if (!active || requestId !== sessionRequestId) {
          return;
        }
        startTransition(() => {
          setFavoriteServiceIds([]);
          setFavoritesReady(true);
        });
      }
    }

    void supabase.auth
      .getUser()
      .then(({ data }) => {
        return applySessionUser(data.user);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        startTransition(() => {
          setUser(null);
          resetFavorites();
          setAuthReady(true);
        });
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      void applySessionUser(session?.user ?? null);
      if (event !== "INITIAL_SESSION") {
        router.refresh();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [
    resetFavorites,
    router,
    setAuthReady,
    setFavoriteServiceIds,
    setFavoritesReady,
    setUser
  ]);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
