"use client";

const suggestionChips = [
  "Replace ID",
  "Find more stable housing support",
  "Build a plan for reliable food access",
  "Get legal help about income and housing"
];

export function RoadmapIntake({
  needs,
  loading,
  onNeedsChange,
  onGenerate
}: {
  needs: string[];
  loading: boolean;
  onNeedsChange: (needs: string[]) => void;
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
            onClick={() =>
              onNeedsChange(needs.includes(chip) ? needs : [...needs, chip])
            }
            className="btn-secondary rounded-full px-4 py-2 text-sm"
          >
            {chip}
          </button>
        ))}
      </div>

      <textarea
        value={needs.join("\n")}
        onChange={(event) =>
          onNeedsChange(
            event.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
          )
        }
        rows={8}
        className="input-surface mt-5 w-full rounded-3xl px-5 py-4 outline-none transition"
      />
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
