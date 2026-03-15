"use client";

import { SignInButton } from "@/components/sign-in-button";

export function RoadmapGate() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <section className="surface-card grid gap-5 rounded-[2rem] px-6 py-8 shadow-card">
        <p className="text-theme-faint text-xs uppercase tracking-[0.22em]">Signed-in feature</p>
        <h1 className="font-display text-4xl font-semibold">Roadmap planning is for logged-in users</h1>
        <p className="text-theme-muted max-w-2xl">
          Create an account or log in to build a longer-term stability plan across this week, this month, and what comes next.
        </p>
        <div className="w-fit">
          <SignInButton />
        </div>
      </section>
    </div>
  );
}
