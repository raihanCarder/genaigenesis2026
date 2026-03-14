"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { mapSupabaseUser } from "@/lib/adapters/supabase-client";
import { useAppStore } from "@/store/app-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const setUser = useAppStore((state) => state.setUser);
  const setAuthReady = useAppStore((state) => state.setAuthReady);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    let active = true;

    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!active) {
          return;
        }
        startTransition(() => {
          setUser(mapSupabaseUser(data.user));
          setAuthReady(true);
        });
      })
      .catch(() => {
        if (!active) {
          return;
        }
        startTransition(() => {
          setUser(null);
          setAuthReady(true);
        });
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) {
        return;
      }
      startTransition(() => {
        setUser(mapSupabaseUser(session?.user ?? null));
        setAuthReady(true);
      });
      if (event !== "INITIAL_SESSION") {
        router.refresh();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router, setAuthReady, setUser]);

  return children;
}
