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
          "btn-secondary rounded-full px-4 py-2 text-sm text-white/45",
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
        "btn-primary rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60",
        compact && "px-3 py-1.5 text-xs"
      )}
    >
      {pending ? "Working..." : user ? "Sign out" : "Sign in with Google"}
    </button>
  );
}
