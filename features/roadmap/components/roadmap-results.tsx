"use client";

import type { LocationContext, RoadmapResponse } from "@/lib/types";

const roadmapSections: Array<{
  key: keyof Pick<RoadmapResponse, "thisWeek" | "thisMonth" | "longerTerm">;
  label: string;
}> = [
  { key: "thisWeek", label: "This week" },
  { key: "thisMonth", label: "This month" },
  { key: "longerTerm", label: "Longer term" }
];

export function RoadmapResults({
  location,
  response,
  servicesLoading,
  servicesError,
  requestError
}: {
  location: LocationContext;
  response: RoadmapResponse | null;
  servicesLoading: boolean;
  servicesError: string | null;
  requestError: string | null;
}) {
  return (
    <section className="grid gap-4">
      <div className="glass-panel rounded-4xl p-6 shadow-card">
        <p className="text-xs uppercase tracking-[0.22em] text-black/45">Plan horizon</p>
        <h2 className="font-display text-2xl font-semibold">{location.label}</h2>
        <p className="mt-3 text-sm text-black/60">
          This plan uses nearby services plus your stated needs. It is not a same-day crisis triage tool.
        </p>
      </div>

      {servicesLoading ? (
        <div className="rounded-4xl border border-black/5 bg-white p-6 text-sm text-black/55 shadow-card">
          Loading nearby services for roadmap planning...
        </div>
      ) : null}

      {servicesError ? (
        <div className="rounded-4xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 shadow-card">
          {servicesError}
        </div>
      ) : null}

      {requestError ? (
        <div className="rounded-4xl border border-red-200 bg-red-50 p-6 text-sm text-red-800 shadow-card">
          {requestError}
        </div>
      ) : null}

      {response ? (
        <div className="grid gap-4">
          <div className="rounded-4xl border border-black/5 bg-white p-5 shadow-card">
            <h3 className="font-display text-2xl font-semibold">Situation summary</h3>
            <p className="mt-3 text-black/65">{response.situationSummary}</p>
          </div>

          {roadmapSections.map((section) => (
            <div key={section.key} className="rounded-4xl border border-black/5 bg-white p-5 shadow-card">
              <h3 className="font-display text-2xl font-semibold">{section.label}</h3>
              <div className="mt-4 grid gap-3">
                {response[section.key].length > 0 ? (
                  response[section.key].map((step) => (
                    <div key={`${section.key}-${step.reason}`} className="rounded-3xl bg-[#fbf7f1] p-4 text-sm text-black/70">
                      {step.reason}
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl bg-[#fbf7f1] p-4 text-sm text-black/55">
                    No specific step returned for this horizon.
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="rounded-4xl border border-black/5 bg-white p-5 shadow-card">
            <h3 className="font-display text-2xl font-semibold">Notes</h3>
            <div className="mt-4 grid gap-2 text-sm text-black/65">
              {response.notes.map((note) => (
                <p key={note}>• {note}</p>
              ))}
              {response.verificationWarnings?.map((note) => (
                <p key={note} className="text-accentDark">
                  • {note}
                </p>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-4xl border border-dashed border-black/10 bg-white p-8 text-sm text-black/55 shadow-card">
          Generate a roadmap to see a staged plan for this week, this month, and longer term.
        </div>
      )}
    </section>
  );
}

