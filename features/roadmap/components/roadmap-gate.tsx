"use client";

import { SignInButton } from "@/components/sign-in-button";

export function RoadmapGate() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <section className="grid gap-5 rounded-[2rem] bg-ink px-6 py-8 text-white shadow-card">
        <p className="text-xs uppercase tracking-[0.22em] text-white/55">Signed-in feature</p>
        <h1 className="font-display text-4xl font-semibold">Roadmap planning is for logged-in users</h1>
        <p className="max-w-2xl text-white/78">
          Create an account or log in to build a longer-term stability plan across this week, this month, and what comes next.
        </p>
        <div className="w-fit">
          <SignInButton />
        </div>
      </section>
    </div>
  );
}
