"use client";

import { useEffect, useState } from "react";
import { getFirebaseClientAuth } from "@/lib/adapters/firebase-client";
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
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setSaved(false);
  }, [user?.uid, service.id]);

  async function handleToggle() {
    if (!user) {
      return;
    }
    const token = await getFirebaseClientAuth()?.currentUser?.getIdToken();
    if (!token) {
      return;
    }
    setPending(true);
    try {
      const action = saved ? "remove" : "save";
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
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
      setSaved(!saved);
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
          "rounded-full border border-black/10 bg-black/5 px-3 py-2 text-xs text-black/50",
          compact && "px-2.5 py-1.5"
        )}
      >
        Sign in to save
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      className={cn(
        "rounded-full border border-accent/25 bg-white px-3 py-2 text-xs font-medium text-accentDark transition hover:border-accent hover:bg-accent/10 disabled:opacity-60",
        compact && "px-2.5 py-1.5"
      )}
    >
      {pending ? "Saving..." : saved ? "Saved" : "Save"}
    </button>
  );
}

