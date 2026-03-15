import { beforeEach, describe, expect, it, vi } from "vitest";

const generateRoadmap = vi.fn();
const requireUserFromRequest = vi.fn();

vi.mock("@/lib/adapters/gemini", () => ({
  generateRoadmap
}));

vi.mock("@/lib/auth/server", () => ({
  requireUserFromRequest
}));

describe("/api/roadmap", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("requires authentication", async () => {
    requireUserFromRequest.mockRejectedValueOnce(new Error("Unauthorized"));

    const { POST } = await import("@/app/api/roadmap/route");
    const request = new Request("http://localhost/api/roadmap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        needs: ["replace id"],
        location: {
          latitude: 43.6532,
          longitude: -79.3832,
          label: "Downtown Toronto"
        },
        services: []
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("serializes the request for generateRoadmap and returns a UI-ready roadmap", async () => {
    requireUserFromRequest.mockResolvedValueOnce({ id: "user-1" });
    generateRoadmap.mockResolvedValueOnce({
      situationSummary: "You have a few urgent admin tasks and one strong nearby service match.",
      thisWeek: [
        {
          serviceId: "shelter-1",
          reason: "Visit the shelter intake desk first so staff can confirm the fastest next step."
        }
      ],
      thisMonth: [
        {
          reason: "Use the next few weeks to organize documents and follow through on referrals."
        }
      ],
      longerTerm: [],
      notes: ["Keep your ID documents together."],
      verificationWarnings: ["Verify intake hours before traveling."],
      thisWeek_summary: "Handle urgent admin needs",
      thisMonth_summary: "Stabilize paperwork and follow-up"
    });

    const { POST } = await import("@/app/api/roadmap/route");
    const request = new Request("http://localhost/api/roadmap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        needs: ["Replace ID", "Find more stable housing support"],
        constraints: {
          city: "Toronto",
          wantsLongTermStability: true
        },
        location: {
          latitude: 43.6532,
          longitude: -79.3832,
          label: "Downtown Toronto",
          city: "Toronto",
          region: "Ontario",
          country: "Canada"
        },
        services: [
          {
            id: "shelter-1",
            name: "Shelter Intake",
            category: "shelters",
            address: "1 Main St, Toronto, ON",
            latitude: 43.65,
            longitude: -79.38,
            distanceMeters: 650,
            sourceType: "manual"
          }
        ]
      })
    });

    const response = await POST(request);
    const payload = (await response.json()) as {
      sections: Array<{
        summary?: string;
        steps: Array<{
          service: { id: string; name: string } | null;
        }>;
      }>;
      verificationWarnings: string[];
    };

    expect(response.status).toBe(200);
    expect(generateRoadmap).toHaveBeenCalledTimes(1);
    expect(generateRoadmap.mock.calls[0]?.[0]).toContain("Location: Downtown Toronto, Toronto, Ontario, Canada");
    expect(generateRoadmap.mock.calls[0]?.[0]).toContain("- Replace ID");
    expect(generateRoadmap.mock.calls[0]?.[0]).toContain("id=shelter-1");
    expect(generateRoadmap.mock.calls[0]?.[0]).toContain("wantsLongTermStability: true");
    expect(payload.sections[0]?.summary).toBe("Handle urgent admin needs");
    expect(payload.sections[0]?.steps[0]?.service).toMatchObject({
      id: "shelter-1",
      name: "Shelter Intake"
    });
    expect(payload.verificationWarnings).toContain("Verify intake hours before traveling.");
  });
});
