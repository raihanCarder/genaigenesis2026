import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/adapters/google-maps", () => ({
  searchSupplementalPlaces: vi.fn(async () => []),
  TORONTO_CENTER: {
    latitude: 43.6532,
    longitude: -79.3832,
    label: "Downtown Toronto"
  }
}));

describe("searchServices", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("filters by category and radius", async () => {
    const { searchServices } = await import("@/lib/services/query");
    const results = await searchServices({
      latitude: 43.6532,
      longitude: -79.3832,
      category: "food",
      radius: 3000
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((service) => service.category === "food")).toBe(true);
    expect(results.every((service) => (service.distanceMeters ?? 0) <= 3000)).toBe(true);
  });

  it("ranks closer curated services ahead of farther ones", async () => {
    const { searchServices } = await import("@/lib/services/query");
    const results = await searchServices({
      latitude: 43.6532,
      longitude: -79.3832,
      category: "food",
      radius: 8000
    });

    expect(results[0]?.distanceMeters).toBeLessThanOrEqual(results[results.length - 1]?.distanceMeters ?? 0);
  });
});

