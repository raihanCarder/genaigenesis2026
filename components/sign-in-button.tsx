"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import {
  getSupabaseAuthErrorMessage,
  signInWithEmailPassword,
  signOutUser,
  signUpWithEmailPassword
} from "@/lib/adapters/supabase-client";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function SignInButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const user = useAppStore((state) => state.user);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, pending]);

  function resetForm(nextMode: "sign-in" | "sign-up" = "sign-in") {
    setMode(nextMode);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setNotice(null);
  }

  function openDialog(nextMode: "sign-in" | "sign-up" = "sign-in") {
    resetForm(nextMode);
    setOpen(true);
  }

  function closeDialog() {
    if (pending) {
      return;
    }
    setOpen(false);
    resetForm(mode);
  }

  async function handleClick() {
    setPending(true);
    try {
      if (user) {
        await signOutUser();
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter an email address.");
      return;
    }
    if (!password) {
      setError("Enter a password.");
      return;
    }
    if (mode === "sign-up") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setPending(true);
    try {
      if (mode === "sign-up") {
        const result = await signUpWithEmailPassword(normalizedEmail, password);
        if (result.session) {
          await signOutUser();
        }
        setMode("sign-in");
        setPassword("");
        setConfirmPassword("");
        setNotice(
          result.session
            ? "Account created. Log in to continue."
            : "Account created. Check your email if confirmation is enabled, then log in."
        );
        return;
      }
      await signInWithEmailPassword(normalizedEmail, password);
      setOpen(false);
      resetForm("sign-in");
      router.refresh();
    } catch (submitError) {
      setError(getSupabaseAuthErrorMessage(submitError));
    } finally {
      setPending(false);
    }
  }

  if (!hasSupabaseEnv) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "btn-secondary rounded-full px-4 py-2 text-sm",
          compact && "px-3 py-1.5 text-xs"
        )}
      >
        Supabase needs config
      </button>
    );
  }

  if (!user) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openDialog("sign-in")}
            disabled={pending}
            className={cn(
              "btn-secondary rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60",
              compact && "px-3 py-1.5 text-xs"
            )}
          >
            {pending ? "Working..." : "Log in"}
          </button>
          <button
            type="button"
            onClick={() => openDialog("sign-up")}
            disabled={pending}
            className={cn(
              "btn-primary rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60",
              compact && "px-3 py-1.5 text-xs"
            )}
          >
            {pending ? "Working..." : "Sign up"}
          </button>
        </div>
        {open ? (
          <div
            className="theme-overlay fixed inset-0 z-50 flex items-center justify-center px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-dialog-title"
          >
            <div className="theme-modal w-full max-w-md rounded-[2rem] p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="theme-modal-faint text-xs uppercase tracking-[0.22em]">Account</p>
                  <h2
                    id="auth-dialog-title"
                    className="mt-2 font-display text-3xl font-semibold"
                  >
                    {mode === "sign-in" ? "Log in" : "Create account"}
                  </h2>
                  <p className="theme-modal-muted mt-2 text-sm">
                    {mode === "sign-in"
                      ? "Use your email and password to access saved services and roadmap planning."
                      : "Create an email/password account first, then log in to continue."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={pending}
                  className="theme-modal-muted rounded-full border border-[color:var(--modal-border)] px-3 py-1.5 text-sm transition hover:bg-[color:var(--modal-chip)] disabled:opacity-60"
                >
                  Close
                </button>
              </div>

              <div className="theme-modal-chip mt-5 grid grid-cols-2 gap-2 rounded-full p-1">
                <button
                  type="button"
                  onClick={() => resetForm("sign-in")}
                  disabled={pending}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm transition disabled:opacity-60",
                    mode === "sign-in"
                      ? "bg-[color:var(--modal-bg)] text-[color:var(--modal-text)] shadow-sm"
                      : "theme-modal-muted"
                  )}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => resetForm("sign-up")}
                  disabled={pending}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm transition disabled:opacity-60",
                    mode === "sign-up"
                      ? "bg-[color:var(--modal-bg)] text-[color:var(--modal-text)] shadow-sm"
                      : "theme-modal-muted"
                  )}
                >
                  Create account
                </button>
              </div>

              <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
                <label className="grid gap-2">
                  <span className="theme-modal-muted text-sm font-medium">Email</span>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="input-surface rounded-2xl px-4 py-3 text-sm outline-none transition"
                    placeholder="you@example.com"
                    disabled={pending}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="theme-modal-muted text-sm font-medium">Password</span>
                  <input
                    type="password"
                    autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="input-surface rounded-2xl px-4 py-3 text-sm outline-none transition"
                    placeholder="At least 6 characters"
                    disabled={pending}
                  />
                </label>

                {mode === "sign-up" ? (
                  <label className="grid gap-2">
                    <span className="theme-modal-muted text-sm font-medium">Confirm password</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="input-surface rounded-2xl px-4 py-3 text-sm outline-none transition"
                      placeholder="Repeat your password"
                      disabled={pending}
                    />
                  </label>
                ) : null}

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    {error}
                  </div>
                ) : null}

                {notice ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {notice}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-full bg-[color:var(--modal-text)] px-4 py-3 text-sm font-medium text-[color:var(--modal-bg)] transition hover:opacity-90 disabled:opacity-60"
                >
                  {pending
                    ? "Working..."
                    : mode === "sign-in"
                      ? "Log in"
                      : "Create account"}
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </>
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
      {pending ? "Working..." : "Sign out"}
    </button>
  );
}
