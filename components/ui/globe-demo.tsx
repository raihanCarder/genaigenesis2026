import { Globe } from "@/components/ui/globe";

export function GlobeDemo() {
  return (
    <div className="relative flex min-h-[32rem] size-full items-center justify-center overflow-hidden rounded-[2rem] border border-black/10 bg-ink px-6 pt-8 shadow-card">
      <span className="pointer-events-none bg-gradient-to-b from-white to-white/10 bg-clip-text text-center font-display text-7xl font-semibold leading-none text-transparent md:text-8xl">
        Globe
      </span>
      <Globe className="top-24 max-w-[640px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_115%,rgba(255,255,255,0.24),rgba(255,255,255,0))]" />
    </div>
  );
}
