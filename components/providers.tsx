"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { startTransition, useEffect } from "react";
import { getFirebaseClientAuth } from "@/lib/adapters/firebase-client";
import { useAppStore } from "@/store/app-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const setUser = useAppStore((state) => state.setUser);
  const setAuthReady = useAppStore((state) => state.setAuthReady);

  useEffect(() => {
    const auth = getFirebaseClientAuth();
    if (!auth) {
      setAuthReady(true);
      return;
    }
    return onAuthStateChanged(
      auth,
      (user: User | null) => {
        startTransition(() => {
          setUser(
            user
              ? {
                  uid: user.uid,
                  displayName: user.displayName,
                  email: user.email,
                  photoURL: user.photoURL
                }
              : null
          );
          setAuthReady(true);
        });
      },
      () => setAuthReady(true)
    );
  }, [setAuthReady, setUser]);

  return children;
}
