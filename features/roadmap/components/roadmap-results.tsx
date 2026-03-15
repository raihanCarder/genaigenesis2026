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
        <p className="text-theme-faint text-xs uppercase tracking-[0.22em]">Plan horizon</p>
        <h2 className="font-display text-2xl font-semibold">{location.label}</h2>
        <p className="text-theme-subtle mt-3 text-sm">
          This plan uses nearby services plus your stated needs. It is not a same-day crisis triage tool.
        </p>
      </div>

      {servicesLoading ? (
        <div className="surface-card text-theme-subtle rounded-4xl p-6 text-sm shadow-card">
          Loading nearby services for roadmap planning...
        </div>
      ) : null}

      {servicesError ? (
        <div className="error-panel rounded-4xl p-6 text-sm shadow-card">
          {servicesError}
        </div>
      ) : null}

      {requestError ? (
        <div className="error-panel rounded-4xl p-6 text-sm shadow-card">
          {requestError}
        </div>
      ) : null}

      {response ? (
        <div className="grid gap-4">
          <div className="surface-card rounded-4xl p-5 shadow-card">
            <h3 className="font-display text-2xl font-semibold">Situation summary</h3>
            <p className="text-theme-soft mt-3">{response.situationSummary}</p>
          </div>

          {roadmapSections.map((section) => (
            <div key={section.key} className="surface-card rounded-4xl p-5 shadow-card">
              <h3 className="font-display text-2xl font-semibold">{section.label}</h3>
              <div className="mt-4 grid gap-3">
                {response[section.key].length > 0 ? (
                  response[section.key].map((step) => (
                    <div key={`${section.key}-${step.reason}`} className="surface-subtle text-theme-soft rounded-3xl p-4 text-sm">
                      {step.reason}
                    </div>
                  ))
                ) : (
                  <div className="surface-subtle text-theme-subtle rounded-3xl p-4 text-sm">
                    No specific step returned for this horizon.
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="surface-card rounded-4xl p-5 shadow-card">
            <h3 className="font-display text-2xl font-semibold">Notes</h3>
            <div className="text-theme-soft mt-4 grid gap-2 text-sm">
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
        <div className="surface-card text-theme-subtle rounded-4xl border border-dashed border-[color:var(--line)] p-8 text-sm shadow-card">
          Generate a roadmap to see a staged plan for this week, this month, and longer term.
        </div>
      )}
    </section>
  );
}
