import { beforeEach, describe, expect, it, vi } from "vitest";

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
  });

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
    const response = await generateGroundedChat({
      message: "Help me find food",
      location: {
        latitude: 43.6532,
        longitude: -79.3832
      },
      services: [
        {
          id: "known-service",
          name: "Known Service",
          category: "food",
          address: "123 Example St",
          latitude: 43.65,
          longitude: -79.38,
          sourceType: "manual"
        }
      ]
    });

    expect(response.recommendedServices).toEqual([
      { serviceId: "known-service", reason: "Relevant" }
    ]);
  });
});

