import { describe, expect, it } from "vitest";
import { buildLocationSearchParams, getLocationFromSearchParams } from "@/lib/location";

describe("location query params", () => {
  it("round-trips extended location metadata", () => {
    const params = buildLocationSearchParams({
      latitude: 40.7128,
      longitude: -74.006,
      label: "New York, NY, USA",
      placeId: "place-123",
      city: "New York",
      region: "NY",
      country: "United States"
    });

    const parsed = getLocationFromSearchParams(Object.fromEntries(new URLSearchParams(params).entries()));

    expect(parsed).toEqual({
      latitude: 40.7128,
      longitude: -74.006,
      label: "New York, NY, USA",
      placeId: "place-123",
      city: "New York",
      region: "NY",
      country: "United States"
    });
  });
});
