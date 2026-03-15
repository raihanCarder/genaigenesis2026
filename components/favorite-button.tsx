"use client";

import { useState } from "react";
import type { ServiceWithMeta } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function FavoriteButton({
  service,
  compact = false
}: {
  service: ServiceWithMeta;
  compact?: boolean;
}) {
  const user = useAppStore((state) => state.user);
  const saved = useAppStore((state) => state.favoriteServiceIds.includes(service.id));
  const favoritesReady = useAppStore((state) => state.favoritesReady);
  const setFavoriteSaved = useAppStore((state) => state.setFavoriteSaved);
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    if (!user || !favoritesReady) {
      return;
    }
    setPending(true);
    try {
      const action = saved ? "remove" : "save";
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action,
          serviceId: service.id,
          service
        })
      });
      if (!response.ok) {
        throw new Error("Unable to update favorite.");
      }
      setFavoriteSaved(service.id, !saved);
    } finally {
      setPending(false);
    }
  }

  if (!user) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "btn-secondary rounded-full px-3 py-2 text-xs",
          compact && "px-2.5 py-1.5"
        )}
      >
        Log in to save
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending || !favoritesReady}
      className={cn(
        "rounded-full border border-accent/35 bg-accent/10 px-3 py-2 text-xs font-medium text-accentDark transition hover:bg-accent/15 disabled:opacity-60",
        compact && "px-2.5 py-1.5"
      )}
    >
      {pending ? saved ? "Removing..." : "Saving..." : !favoritesReady ? "Loading..." : saved ? "Saved" : "Save"}
    </button>
  );
}
