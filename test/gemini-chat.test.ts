import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  hasGeminiEnv: true,
  serverEnv: {
    GEMINI_API_KEY: "test-key",
    GEMINI_MODEL: "test-model"
  }
}));

describe("generateGroundedChat", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const basePayload = {
    message: "Help me find food",
    location: {
      latitude: 43.6532,
      longitude: -79.3832,
      label: "Downtown Toronto"
    },
    warnings: [],
    services: [
      {
        id: "known-service",
        name: "Known Service",
        category: "food" as const,
        address: "123 Example St",
        latitude: 43.65,
        longitude: -79.38,
        sourceType: "manual" as const
      }
    ]
  };

  it("drops unknown service ids from the final response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      intent: "relevant",
                      summary: "Test response",
                      recommendedServices: [
                        { serviceId: "known-service", reason: "Relevant" },
                        { serviceId: "unknown-service", reason: "Should be removed" }
                      ],
                      nextSteps: ["Call first"]
                    })
                  }
                ]
              }
            }
          ]
        })
      }))
    );

    const { generateGroundedChat } = await import("@/lib/adapters/gemini");
    const response = await generateGroundedChat(basePayload);

    expect(response.intent).toBe("relevant");
    expect(response.recommendedServices).toEqual([
      { serviceId: "known-service", reason: "Relevant" }
    ]);
  });

  it("returns the fixed irrelevant response when Gemini marks a prompt as irrelevant", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      intent: "irrelevant",
                      summary: "This is unrelated",
                      recommendedServices: [],
                      nextSteps: [],
                      verificationWarning: null
                    })
                  }
                ]
              }
            }
          ]
        })
      }))
    );

    const { generateGroundedChat } = await import("@/lib/adapters/gemini");
    const response = await generateGroundedChat({
      ...basePayload,
      message: "Tell me a joke"
    });

    expect(response).toEqual({
      intent: "irrelevant",
      summary: "Ask me something related to support services in Downtown Toronto.",
      recommendedServices: [],
      nextSteps: []
    });
  });

  it("falls back to the deterministic local response when Gemini returns no valid known ids", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      intent: "relevant",
                      summary: "Broken response",
                      recommendedServices: [
                        { serviceId: "unknown-service", reason: "Should not survive" }
                      ],
                      nextSteps: ["Call first"]
                    })
                  }
                ]
              }
            }
          ]
        })
      }))
    );

    const { generateGroundedChat } = await import("@/lib/adapters/gemini");
    const response = await generateGroundedChat(basePayload);

    expect(response.intent).toBe("relevant");
    expect(response.summary).toContain('Here are the strongest nearby options based on distance, freshness, and fit for "Help me find food".');
    expect(response.recommendedServices).toEqual([
      {
        serviceId: "known-service",
        reason: "Known Service is Nearby away and has limited data."
      }
    ]);
  });
});
