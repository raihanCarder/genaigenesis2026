import { LocationEntry } from "@/components/location-entry";

export default function HomePage() {
  return (
    <div className="grid-lines">
      <section className="mx-auto flex min-h-[calc(100vh-72px)] max-w-6xl flex-col justify-center gap-10 px-4 py-12 md:px-6">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.28em] text-white/48">
            Toronto demo MVP
          </p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-[0.95] md:text-7xl">
            Find nearby support, then plan toward stability.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/70">
            Browse essential services without signing in. Use grounded chat for
            local questions. Sign in only when you want a longer-term roadmap or
            saved places.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
          <LocationEntry />
        </div>
      </section>
    </div>
  );
}
