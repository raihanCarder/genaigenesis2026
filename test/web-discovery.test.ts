import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  braveSearchApiKey: undefined,
  hasGeminiEnv: false,
  hasBraveSearchEnv: false,
  serverEnv: {
    GEMINI_API_KEY: undefined,
    GEMINI_MODEL: "test-model"
  }
}));

vi.mock("@/lib/adapters/google-maps", () => ({
  geocodeLocation: vi.fn(async () => {
    throw new Error("not found");
  }),
  getPlaceDetails: vi.fn(async () => null),
  searchPlaceMetadataByText: vi.fn(async () => null)
}));

describe("trusted web discovery", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rejects social, blog, and news-style URLs", async () => {
    const { isTrustedDiscoveryUrl } = await import("@/lib/adapters/web-discovery");

    expect(isTrustedDiscoveryUrl("https://facebook.com/local-program")).toBe(false);
    expect(isTrustedDiscoveryUrl("https://medium.com/@writer/helpful-post")).toBe(false);
    expect(isTrustedDiscoveryUrl("https://www.cbc.ca/news/canada/toronto/story")).toBe(false);
    expect(isTrustedDiscoveryUrl("https://www.toronto.ca/community-people/housing-shelter/")).toBe(
      true
    );
  });

  it("drops discovered candidates that cannot be validated to a nearby place", async () => {
    const { validateDiscoveredCandidate } = await import("@/lib/adapters/web-discovery");

    const result = await validateDiscoveredCandidate({
      candidate: {
        name: "Example Meal Program",
        category: "food",
        address: "Unknown location"
      },
      location: {
        latitude: 43.6532,
        longitude: -79.3832,
        label: "Downtown Toronto"
      },
      radiusMeters: 4000,
      sourceUrl: "https://www.toronto.ca/community-meals"
    });

    expect(result).toBeNull();
  });
});
