import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { RoadmapClient } from "@/components/roadmap-client";
import { useAppStore } from "@/store/app-store";

describe("RoadmapClient", () => {
  beforeEach(() => {
    useAppStore.setState({
      location: null,
      services: [],
      selectedCategory: null,
      user: null,
      authReady: true
    });
  });

  it("shows a sign-in CTA when the user is logged out", () => {
    render(
      <RoadmapClient
        initialLocation={{ latitude: 43.6532, longitude: -79.3832, label: "Downtown Toronto" }}
      />
    );

    expect(screen.getByText("Roadmap planning is for logged-in users")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
