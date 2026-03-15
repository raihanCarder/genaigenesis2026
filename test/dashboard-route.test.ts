import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/dashboard", () => ({
  getDashboardPayload: vi.fn(async () => ({
    location: {
      latitude: 43.6532,
      longitude: -79.3832,
      label: "Downtown Toronto",
      placeId: "anchor-place"
    },
    anchorPlace: {
      placeId: "anchor-place",
      name: "Anchor Place",
      address: "1 Main St, Toronto, ON",
      latitude: 43.6532,
      longitude: -79.3832,
      types: ["point_of_interest"]
    },
    services: [
      {
        id: "food-1",
        name: "Food Service",
        category: "food",
        address: "1 Main St",
        latitude: 43.65,
        longitude: -79.38,
        sourceType: "manual"
      }
    ],
    warnings: ["Verify hours before traveling."]
  }))
}));

describe("/api/dashboard", () => {
  it("returns aggregated dashboard payload", async () => {
    const { GET } = await import("@/app/api/dashboard/route");

    const response = await GET(
      new Request(
        "http://localhost/api/dashboard?lat=43.6532&lng=-79.3832&label=Downtown%20Toronto"
      )
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      services: Array<{ id: string }>;
      warnings: string[];
    };
    expect(payload.services[0]?.id).toBe("food-1");
    expect(payload.warnings).toContain("Verify hours before traveling.");
  });
});
