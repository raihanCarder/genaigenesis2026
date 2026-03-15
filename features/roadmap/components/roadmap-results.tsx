"use client";

import Link from "next/link";
import { buildLocationSearchParams } from "@/lib/location";
import type { LocationContext, RoadmapView } from "@/lib/types";
import { formatCategoryLabel, formatDistance } from "@/lib/utils";

export function RoadmapResults({
  location,
  response,
  servicesLoading,
  servicesError,
  requestError
}: {
  location: LocationContext;
  response: RoadmapView | null;
  servicesLoading: boolean;
  servicesError: string | null;
  requestError: string | null;
}) {
  const locationParams = buildLocationSearchParams(location);

  return (
    <section className="grid gap-4 md:flex md:min-h-0 md:flex-col">
      <div className="glass-panel rounded-4xl p-6 shadow-card">
        <p className="text-xs uppercase tracking-[0.22em] text-white/45">Plan horizon</p>
        <h2 className="font-display text-2xl font-semibold">{location.label}</h2>
        <p className="mt-3 text-sm text-white/60">
          This plan uses nearby services plus your stated needs. It is not a same-day crisis triage tool.
        </p>
      </div>

      {servicesLoading ? (
        <div className="surface-card rounded-4xl p-6 text-sm text-white/55 shadow-card">
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

      <div className="md:chat-scrollbar md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-1">
        {response ? (
          <div className="grid gap-4">
            <div className="surface-card rounded-4xl p-5 shadow-card">
              <h3 className="font-display text-2xl font-semibold">Situation summary</h3>
              <p className="mt-3 text-white/65">{response.situationSummary}</p>
            </div>

            {response.sections.map((section) => (
              <div key={section.key} className="surface-card rounded-4xl p-5 shadow-card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-2xl font-semibold">{section.label}</h3>
                    {section.summary ? (
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/38">
                        {section.summary}
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-white/6 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/42">
                    {section.steps.length} step{section.steps.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  {section.steps.length > 0 ? (
                    section.steps.map((step) => (
                      <div key={step.id} className="surface-subtle rounded-3xl p-4">
                        {step.service ? (
                          <div className="mb-3 flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-[0.68rem] uppercase tracking-[0.2em] text-white/36">
                                {formatCategoryLabel(step.service.category)}
                              </p>
                              <p className="mt-1.5 text-sm font-semibold text-white">
                                {step.service.name}
                              </p>
                              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/34">
                                {step.service.address}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accentDark">
                                {formatDistance(step.service.distanceMeters)}
                              </span>
                              <Link
                                href={`/services/${step.service.id}?${locationParams}`}
                                className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-medium text-white transition hover:border-white/22 hover:bg-white/[0.05]"
                              >
                                View details
                              </Link>
                            </div>
                          </div>
                        ) : null}

                        {!step.service && step.serviceId ? (
                          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-white/34">
                            Referenced service: {step.serviceId}
                          </p>
                        ) : null}

                        <p className="text-sm text-white/70">{step.reason}</p>
                      </div>
                    ))
                  ) : (
                    <div className="surface-subtle rounded-3xl p-4 text-sm text-white/55">
                      No specific step returned for this horizon.
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="surface-card rounded-4xl p-5 shadow-card">
              <h3 className="font-display text-2xl font-semibold">Notes</h3>
              <div className="mt-4 grid gap-2 text-sm text-white/65">
                {response.notes.length === 0 && response.verificationWarnings.length === 0 ? (
                  <p>No additional notes were returned for this plan.</p>
                ) : null}
                {response.notes.map((note) => (
                  <p key={note}>• {note}</p>
                ))}
                {response.verificationWarnings.map((note) => (
                  <p key={note} className="text-accentDark">
                    • {note}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="surface-card rounded-4xl border-dashed border-white/10 p-8 text-sm text-white/55 shadow-card">
            Generate a roadmap to see a staged plan for this week, this month, and longer term.
          </div>
        )}
      </div>
    </section>
  );
}
