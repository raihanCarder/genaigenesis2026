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
        json: async () => [
          {
            id: "food-1",
            name: "Food Service",
            category: "food",
            address: "1 Main St",
            latitude: 43.65,
            longitude: -79.38,
            sourceType: "manual"
          },
          {
            id: "shelter-1",
            name: "Shelter Service",
            category: "shelters",
            address: "2 Main St",
            latitude: 43.66,
            longitude: -79.39,
            sourceType: "manual"
          }
        ]
      }))
    );

    render(
      <DashboardClient
        initialLocation={{ latitude: 43.6532, longitude: -79.3832, label: "Downtown Toronto" }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Food Service")).toBeInTheDocument();
      expect(screen.getByText("Shelter Service")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Shelters" }));

    await waitFor(() => {
      expect(screen.queryByText("Food Service")).not.toBeInTheDocument();
      expect(screen.getByText("Shelter Service")).toBeInTheDocument();
    });
  });
});

