"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseEnv, supabasePublishableKey, supabaseUrl } from "@/lib/env";

let browserClient: SupabaseClient | null | undefined;

export function getSupabaseBrowserClient() {
  if (!hasSupabaseEnv || !supabaseUrl || !supabasePublishableKey) {
    return null;
  }
  if (browserClient) {
    return browserClient;
  }
  browserClient = createBrowserClient(supabaseUrl, supabasePublishableKey);
  return browserClient;
}
