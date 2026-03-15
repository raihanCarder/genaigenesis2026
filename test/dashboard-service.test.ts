import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/adapters/google-maps", () => ({
  geocodeLocation: vi.fn(async ({ latitude, longitude, label, placeId }) => ({
    normalizedLocation: label ?? "Downtown Toronto",
    label: label ?? "Downtown Toronto",
    latitude: latitude ?? 43.6532,
    longitude: longitude ?? -79.3832,
    placeId: placeId ?? "anchor-place",
    city: "Toronto",
    region: "ON",
    country: "Canada"
  })),
  getPlaceDetails: vi.fn(async ({ placeId }) => ({
    placeId,
    name: "Anchor Place",
    address: "1 Main St, Toronto, ON",
    latitude: 43.6532,
    longitude: -79.3832,
    city: "Toronto",
    region: "ON",
    country: "Canada",
    types: ["point_of_interest"],
    website: "https://www.toronto.ca",
    openNow: true
  })),
  searchSupplementalPlaces: vi.fn(async ({ category }) =>
    category === "food"
      ? [
          {
            id: "maps-food",
            name: "Mapped Meal Program",
            category: "food",
            address: "25 King St W, Toronto, ON",
            latitude: 43.6525,
            longitude: -79.381,
            placeId: "place-food",
            website: "https://maps.example/meal",
            openNow: true,
            sourceType: "maps",
            sourceName: "Google Places"
          }
        ]
      : []
  )
}));

vi.mock("@/lib/adapters/web-discovery", () => ({
  discoverTrustedWebResources: vi.fn(async () => ({
    services: [],
    warnings: ["Trusted web discovery is unavailable because Brave Search is not configured."]
  }))
}));

vi.mock("@/lib/services/normalization", () => ({
  getCuratedServices: vi.fn(() => [
    {
      id: "manual-food",
      name: "Curated Food Bank",
      category: "food",
      description: "Curated description",
      address: "10 Queen St W, Toronto, ON",
      latitude: 43.6521,
      longitude: -79.383,
      sourceType: "manual",
      sourceName: "Toronto curated dataset"
    }
  ]),
  withDistance: (service: unknown, distanceMeters?: number) => ({
    ...(service as object),
    distanceMeters
  })
}));

vi.mock("@/lib/services/ranking", () => ({
  rankServices: vi.fn((services) => services)
}));

describe("dashboard aggregation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("merges duplicate place matches while preserving scraped descriptions and Google metadata", async () => {
    const { mergeDashboardServices } = await import("@/lib/services/dashboard");

    const merged = mergeDashboardServices([
      {
        id: "scraped-food",
        name: "Hope Mission Meals",
        category: "food",
        description: "Official meal program details",
        address: "100 Front St W, Toronto, ON",
        latitude: 43.64,
        longitude: -79.4,
        placeId: "place-1",
        sourceType: "scraped",
        sourceName: "hope.org",
        sourceUrl: "https://hope.org/meals"
      },
      {
        id: "maps-food",
        name: "Hope Mission Meals",
        category: "food",
        address: "100 Front St W, Toronto, ON",
        latitude: 43.645,
        longitude: -79.38,
        placeId: "place-1",
        website: "https://maps.google.com/hope",
        openNow: true,
        sourceType: "maps",
        sourceName: "Google Places"
      }
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      id: "scraped-food",
      description: "Official meal program details",
      latitude: 43.645,
      longitude: -79.38,
      website: "https://maps.google.com/hope",
      openNow: true,
      sourceUrl: "https://hope.org/meals"
    });
  });

  it("returns mixed-source dashboard data and warnings when web discovery is unavailable", async () => {
    const { getDashboardPayload } = await import("@/lib/services/dashboard");

    const payload = await getDashboardPayload({
      location: {
        latitude: 43.6532,
        longitude: -79.3832,
        label: "Downtown Toronto"
      }
    });

    expect(payload.anchorPlace?.name).toBe("Anchor Place");
    expect(payload.services.map((service) => service.id)).toEqual(
      expect.arrayContaining(["manual-food", "maps-food"])
    );
    expect(payload.warnings).toContain(
      "Trusted web discovery is unavailable because Brave Search is not configured."
    );
  });
});
