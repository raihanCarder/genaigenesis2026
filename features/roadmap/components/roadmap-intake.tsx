"use client";

const suggestionChips = [
  "Replace ID",
  "Find more stable housing support",
  "Build a plan for reliable food access",
  "Get legal help about income and housing"
];

export function RoadmapIntake({
  needs,
  needsInput,
  loading,
  onNeedsInputChange,
  onAddNeed,
  onGenerate
}: {
  needs: string[];
  needsInput: string;
  loading: boolean;
  onNeedsInputChange: (value: string) => void;
  onAddNeed: (need: string) => void;
  onGenerate: () => void;
}) {
  return (
    <section className="glass-panel rounded-4xl p-6 shadow-card">
      <p className="text-xs uppercase tracking-[0.22em] text-white/45">Roadmap intake</p>
      <h1 className="font-display text-3xl font-semibold">Build a longer-term stability plan</h1>
      <p className="mt-3 text-white/65">
        Start with the needs that matter most over the next few weeks.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {suggestionChips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onAddNeed(chip)}
            className="btn-secondary rounded-full px-4 py-2 text-sm"
            disabled={needs.includes(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="surface-card mt-5 overflow-hidden rounded-[2rem] border border-white/10 shadow-card transition focus-within:border-accent/40 focus-within:bg-white/[0.02]">
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-5 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-white/38">Your priorities</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">One need per line</p>
        </div>
        <textarea
          value={needsInput}
          onChange={(event) => onNeedsInputChange(event.target.value)}
          rows={8}
          placeholder={"Replace ID\nFind stable housing support\nGet legal help about income"}
          className="chat-scrollbar min-h-[18rem] w-full resize-y bg-transparent px-5 py-4 text-base leading-8 text-white outline-none placeholder:text-white/28"
        />
      </div>
      <button
        type="button"
        onClick={onGenerate}
        disabled={loading}
        className="btn-primary mt-4 rounded-full px-5 py-3 font-medium disabled:opacity-60"
      >
        {loading ? "Building roadmap..." : "Generate roadmap"}
      </button>
    </section>
  );
}
