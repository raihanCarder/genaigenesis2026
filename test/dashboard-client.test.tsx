import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardClient } from "@/components/dashboard-client";
import { useAppStore } from "@/store/app-store";

describe("DashboardClient", () => {
  beforeEach(() => {
    useAppStore.setState({
      location: null,
      services: [],
      selectedCategory: null,
      user: null,
      authReady: true
    });
  });

  it("filters visible services by category", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        json: async () => ({
          location: {
            latitude: 43.6532,
            longitude: -79.3832,
            label: "Downtown Toronto",
            placeId: "anchor-place"
          },
          anchorPlace: {
            placeId: "anchor-place",
            name: "Yonge-Dundas Square",
            address: "1 Dundas St E, Toronto, ON",
            latitude: 43.6561,
            longitude: -79.3802,
            types: ["point_of_interest"],
            website: "https://www.toronto.ca",
            openNow: true
          },
          warnings: ["Verify hours before traveling."],
          services: [
            {
              id: "food-1",
              name: "Food Service",
              category: "food",
              address: "1 Main St",
              latitude: 43.65,
              longitude: -79.38,
              sourceType: "maps",
              sourceName: "Google Places"
            },
            {
              id: "shelter-1",
              name: "Shelter Service",
              category: "shelters",
              address: "2 Main St",
              latitude: 43.66,
              longitude: -79.39,
              sourceType: "scraped",
              sourceName: "cityhelp.org"
            }
          ]
        })
      }))
    );

    render(
      <DashboardClient
        initialLocation={{ latitude: 43.6532, longitude: -79.3832, label: "Downtown Toronto" }}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText("Food Service").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Shelter Service").length).toBeGreaterThan(0);
      expect(screen.getByText("Verify hours before traveling.")).toBeInTheDocument();
      expect(screen.getByText("Source: cityhelp.org")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Shelters" }));

    await waitFor(() => {
      expect(screen.queryAllByText("Food Service")).toHaveLength(0);
      expect(screen.getAllByText("Shelter Service").length).toBeGreaterThan(0);
    });
  });
});
