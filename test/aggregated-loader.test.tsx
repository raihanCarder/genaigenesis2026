import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatClient } from "@/components/chat-client";
import { fetchRoadmapServices } from "@/features/roadmap/api/roadmap-api";
import { useAppStore } from "@/store/app-store";

const { fetchDashboardPayload } = vi.hoisted(() => ({
  fetchDashboardPayload: vi.fn(async () => ({
    location: {
      latitude: 43.6532,
      longitude: -79.3832,
      label: "Downtown Toronto"
    },
    anchorPlace: null,
    warnings: ["Verify hours before traveling."],
    services: [
      {
        id: "shared-food",
        name: "Shared Food Bank",
        category: "food",
        address: "123 Shared St",
        latitude: 43.652,
        longitude: -79.382,
        sourceType: "scraped",
        sourceName: "shared.org"
      }
    ]
  }))
}));

vi.mock("@/features/dashboard/api/dashboard-api", () => ({
  fetchDashboardPayload,
  getCachedDashboardPayload: vi.fn(() => null)
}));

describe("aggregated dashboard loader reuse", () => {
  beforeEach(() => {
    fetchDashboardPayload.mockClear();
    useAppStore.setState({
      location: null,
      services: [],
      selectedCategory: null,
      user: null,
      authReady: true
    });
  });

  it("feeds the same aggregated payload into chat and roadmap loaders", async () => {
    render(
      <ChatClient
        initialLocation={{ latitude: 43.6532, longitude: -79.3832, label: "Downtown Toronto" }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Shared Food Bank")).toBeInTheDocument();
    });

    const roadmapServices = await fetchRoadmapServices({
      latitude: 43.6532,
      longitude: -79.3832,
      label: "Downtown Toronto"
    });

    expect(roadmapServices).toHaveLength(1);
    expect(roadmapServices[0]?.id).toBe("shared-food");
    expect(fetchDashboardPayload).toHaveBeenCalledTimes(2);
  });
});
