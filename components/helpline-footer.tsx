import { helplines } from "@/lib/constants/helplines";

export function HelplineFooter() {
  return (
    <section className="glass-panel rounded-4xl p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-theme-faint text-xs uppercase tracking-[0.22em]">Always available</p>
          <h2 className="font-display text-2xl font-semibold">Helplines and urgent support</h2>
        </div>
        <div className="rounded-full border border-accent/35 bg-accent/10 px-4 py-2 text-xs font-medium text-accentDark">
          Keep these even if search results are thin
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {helplines.map((line) => (
          <div key={line.name} className="surface-card rounded-3xl p-4">
            <p className="text-sm font-semibold">{line.name}</p>
            <p className="text-theme-subtle mt-1 text-sm">{line.description}</p>
            <p className="mt-3 text-lg font-semibold text-accentDark">{line.phone}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
