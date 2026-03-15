import { z } from "zod";

const serverEnvSchema = z.object({
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  GOOGLE_PLACES_API_FLAVOR: z.enum(["legacy", "new"]).default("legacy"),
  BRAVE_SEARCH_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash")
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional()
});

export const serverEnv = serverEnvSchema.parse(process.env);
export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
});

export const hasGoogleMapsEnv = Boolean(serverEnv.GOOGLE_MAPS_API_KEY);
export const braveSearchApiKey = serverEnv.BRAVE_SEARCH_API_KEY;
export const hasBraveSearchEnv = Boolean(braveSearchApiKey);
export const hasGeminiEnv = Boolean(serverEnv.GEMINI_API_KEY);
export const supabaseUrl = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
export const supabasePublishableKey =
  clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const hasSupabaseEnv = Boolean(supabaseUrl && supabasePublishableKey);
