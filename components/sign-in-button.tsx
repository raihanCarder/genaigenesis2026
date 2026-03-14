"use client";

import { useState } from "react";
import { hasFirebaseClientEnv } from "@/lib/env";
import { signInWithGoogle, signOutUser } from "@/lib/adapters/firebase-client";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function SignInButton({ compact = false }: { compact?: boolean }) {
  const [pending, setPending] = useState(false);
  const user = useAppStore((state) => state.user);

  async function handleClick() {
    setPending(true);
    try {
      if (user) {
        await signOutUser();
      } else {
        await signInWithGoogle();
      }
    } finally {
      setPending(false);
    }
  }

  if (!hasFirebaseClientEnv) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "rounded-full border border-black/10 bg-black/5 px-4 py-2 text-sm text-black/40",
          compact && "px-3 py-1.5 text-xs"
        )}
      >
        Auth needs config
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={cn(
        "rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-accentDark disabled:opacity-60",
        compact && "px-3 py-1.5 text-xs"
      )}
    >
      {pending ? "Working..." : user ? "Sign out" : "Sign in with Google"}
    </button>
  );
}

