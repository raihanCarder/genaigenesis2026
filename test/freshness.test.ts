import { describe, expect, it } from "vitest";
import { getFreshnessState } from "@/lib/services/freshness";
import type { Service } from "@/lib/types";

const baseService: Service = {
  id: "test-service",
  name: "Test Service",
  category: "shelters",
  address: "123 Test St",
  latitude: 43.65,
  longitude: -79.38,
  sourceType: "manual"
};

describe("getFreshnessState", () => {
  it("marks recent shelter data as fresh", () => {
    expect(
      getFreshnessState(
        { ...baseService, lastVerifiedAt: "2026-03-10T00:00:00.000Z" },
        new Date("2026-03-14T00:00:00.000Z")
      )
    ).toBe("fresh");
  });

  it("marks older shelter data as stale", () => {
    expect(
      getFreshnessState(
        { ...baseService, lastVerifiedAt: "2026-02-01T00:00:00.000Z" },
        new Date("2026-03-14T00:00:00.000Z")
      )
    ).toBe("stale");
  });

  it("returns unknown when verification time is missing", () => {
    expect(getFreshnessState(baseService, new Date("2026-03-14T00:00:00.000Z"))).toBe("unknown");
  });
});

