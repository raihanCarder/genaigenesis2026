import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/roadmap/route";

describe("/api/roadmap", () => {
  it("requires authentication", async () => {
    const request = new Request("http://localhost/api/roadmap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        needs: ["replace id"],
        location: {
          latitude: 43.6532,
          longitude: -79.3832
        },
        services: []
      })
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});

