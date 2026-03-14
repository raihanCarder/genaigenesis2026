"use client";

import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SessionUser } from "@/lib/types";

export function mapSupabaseUser(user: User | null): SessionUser | null {
  if (!user) {
    return null;
  }
  return {
    uid: user.id,
    displayName:
      typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name
        : null,
    email: user.email ?? null,
    photoURL: null
  };
}

export async function signUpWithEmailPassword(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase environment is not configured.");
  }
  const emailRedirectTo =
    typeof window === "undefined"
      ? undefined
      : new URL("/auth/callback", window.location.origin).toString();
  const result = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo
    }
  });
  if (result.error) {
    throw result.error;
  }
  return result.data;
}

export async function signInWithEmailPassword(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("Supabase environment is not configured.");
  }
  const result = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password
  });
  if (result.error) {
    throw result.error;
  }
  return result.data;
}

export async function signOutUser() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return;
  }
  const result = await supabase.auth.signOut();
  if (result.error) {
    throw result.error;
  }
}

export function getSupabaseAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (message.includes("email not confirmed")) {
    return "Confirm your email before logging in.";
  }
  if (message.includes("user already registered")) {
    return "That email already has an account. Log in instead.";
  }
  if (message.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }
  if (message.includes("unable to validate email address")) {
    return "Enter a valid email address.";
  }
  if (message.includes("rate limit")) {
    return "Too many attempts. Try again later.";
  }

  return error instanceof Error ? error.message : "Authentication failed.";
}
