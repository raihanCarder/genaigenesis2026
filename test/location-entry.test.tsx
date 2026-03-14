import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocationEntry } from "@/components/location-entry";
import { useAppStore } from "@/store/app-store";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push
  })
}));

function jsonResponse(payload: unknown, init?: { ok?: boolean; status?: number }) {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    headers: {
      get: () => "application/json"
    },
    json: async () => payload
  };
}

describe("LocationEntry", () => {
  beforeEach(() => {
    push.mockReset();
    vi.useRealTimers();
    useAppStore.setState({
      location: null,
      services: [],
      selectedCategory: null,
      user: null,
      authReady: true
    });
  });

  it("geocodes a typed location and navigates to the dashboard", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          normalizedLocation: "Downtown Toronto, Toronto, ON, Canada",
          label: "Downtown Toronto, Toronto, ON, Canada",
          latitude: 43.6532,
          longitude: -79.3832
        })
      )
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

  it("uses an autocomplete suggestion placeId when the user selects a likely match", async () => {
    vi.useFakeTimers();
    let geocodeBody: unknown;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input, init) => {
        const url = String(input);
        if (url.startsWith("/api/location/autocomplete?")) {
          return jsonResponse([
            {
              placeId: "place-123",
              label: "New York, NY, USA",
              primaryText: "New York",
              secondaryText: "NY, USA"
            }
          ]);
        }
        if (url === "/api/location/geocode") {
          geocodeBody = init?.body ? JSON.parse(String(init.body)) : undefined;
          return jsonResponse({
            normalizedLocation: "New York, NY, USA",
            label: "New York, NY, USA",
            latitude: 40.7128,
            longitude: -74.006,
            placeId: "place-123",
            city: "New York",
            region: "NY",
            country: "United States"
          });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      })
    );

    render(<LocationEntry />);

    const input = screen.getByPlaceholderText("Downtown Toronto");
    fireEvent.focus(input);
    fireEvent.change(input, {
      target: { value: "New Yor" }
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByText("New York")).toBeInTheDocument();
      expect(screen.getByText("NY, USA")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /New York/ }));

    await waitFor(() => {
      expect(geocodeBody).toEqual({
        location: "New York, NY, USA",
        placeId: "place-123",
        label: "New York, NY, USA"
      });
      expect(push).toHaveBeenCalledWith(
        "/dashboard?lat=40.7128&lng=-74.006&label=New+York%2C+NY%2C+USA&placeId=place-123&city=New+York&region=NY&country=United+States"
      );
    });
  });
});
