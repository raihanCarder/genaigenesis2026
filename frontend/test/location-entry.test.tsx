import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocationEntry } from "@/components/location-entry";
import { useAppStore } from "@/store/app-store";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push
  })
}));

describe("LocationEntry", () => {
  beforeEach(() => {
    push.mockReset();
    useAppStore.setState({
      location: null,
      services: [],
      selectedCategory: null,
      user: null,
      authReady: true
    });
  });

  it("geocodes a location and navigates to the dashboard", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          normalizedLocation: "Downtown Toronto, Toronto, ON, Canada",
          latitude: 43.6532,
          longitude: -79.3832
        })
      }))
    );

    render(<LocationEntry />);
    fireEvent.change(screen.getByPlaceholderText("Downtown Toronto"), {
      target: { value: "Downtown Toronto" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Open dashboard" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith(
        "/dashboard?lat=43.6532&lng=-79.3832&label=Downtown+Toronto%2C+Toronto%2C+ON%2C+Canada"
      );
    });
  });
});

