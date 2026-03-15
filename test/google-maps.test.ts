import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  hasGoogleMapsEnv: true,
  serverEnv: {
    GOOGLE_MAPS_API_KEY: "test-key",
    GOOGLE_PLACES_API_FLAVOR: "legacy"
  }
}));

describe("google maps location resolution", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("uses Place Details directly when a placeId is provided", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toContain("place/details");
      return {
        json: async () => ({
          status: "OK",
          result: {
            place_id: "place-123",
            name: "Union Station",
            formatted_address: "65 Front St W, Toronto, ON, Canada",
            geometry: {
              location: {
                lat: 43.6452,
                lng: -79.3806
              }
            },
            address_components: [
              { long_name: "Toronto", short_name: "Toronto", types: ["locality"] },
              { long_name: "Ontario", short_name: "ON", types: ["administrative_area_level_1"] },
              { long_name: "Canada", short_name: "CA", types: ["country"] }
            ],
            types: ["train_station"],
            website: "https://www.toronto.ca"
          }
        })
      };
    });

    vi.stubGlobal("fetch", fetchMock);

    const { geocodeLocation } = await import("@/lib/adapters/google-maps");
    const result = await geocodeLocation({
      placeId: "place-123",
      label: "Union Station"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      label: "Union Station",
      placeId: "place-123",
      city: "Toronto",
      region: "ON",
      country: "Canada"
    });
  });

  it("falls back to geocoding and then hydrates with Place Details for free-text input", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/geocode/")) {
        return {
          json: async () => ({
            status: "OK",
            results: [
              {
                formatted_address: "100 Queen St W, Toronto, ON, Canada",
                place_id: "place-456",
                geometry: {
                  location: {
                    lat: 43.6534,
                    lng: -79.3841
                  }
                }
              }
            ]
          })
        };
      }

      expect(url).toContain("place/details");
      return {
        json: async () => ({
          status: "OK",
          result: {
            place_id: "place-456",
            name: "Toronto City Hall",
            formatted_address: "100 Queen St W, Toronto, ON, Canada",
            geometry: {
              location: {
                lat: 43.6534,
                lng: -79.3841
              }
            },
            address_components: [
              { long_name: "Toronto", short_name: "Toronto", types: ["locality"] },
              { long_name: "Ontario", short_name: "ON", types: ["administrative_area_level_1"] },
              { long_name: "Canada", short_name: "CA", types: ["country"] }
            ],
            types: ["city_hall"]
          }
        })
      };
    });

    vi.stubGlobal("fetch", fetchMock);

    const { geocodeLocation } = await import("@/lib/adapters/google-maps");
    const result = await geocodeLocation({
      location: "100 Queen St W Toronto"
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      placeId: "place-456",
      city: "Toronto",
      region: "ON",
      country: "Canada"
    });
  });
});
