import type { SupabaseClient } from "@supabase/supabase-js";
import { ServiceWithMetaSchema, type ServiceWithMeta } from "@/lib/types";

type FavoriteRow = {
  service_snapshot: unknown;
  saved_at: string;
};

export async function listFavorites(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("favorites")
    .select("service_snapshot, saved_at")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data as FavoriteRow[]).map((entry) => ServiceWithMetaSchema.parse(entry.service_snapshot));
}

export async function saveFavorite(
  supabase: SupabaseClient,
  userId: string,
  service: ServiceWithMeta
) {
  const { error } = await supabase.from("favorites").upsert(
    {
      user_id: userId,
      service_id: service.id,
      service_snapshot: service,
      saved_at: new Date().toISOString()
    },
    {
      onConflict: "user_id,service_id"
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeFavorite(supabase: SupabaseClient, userId: string, serviceId: string) {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("service_id", serviceId);

  if (error) {
    throw new Error(error.message);
  }
}
