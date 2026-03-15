import { beforeEach, describe, expect, it, vi } from "vitest";

const favorites: Array<{ id: string; name: string }> = [];

vi.mock("@/lib/auth/server", () => ({
  requireUserFromRequest: vi.fn(async () => ({ id: "user-1" }))
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ mocked: true }))
}));

vi.mock("@/lib/services/favorites-store", () => ({
  listFavorites: vi.fn(async () => [...favorites]),
  saveFavorite: vi.fn(async (_supabase, _userId, service) => {
    favorites.splice(
      0,
      favorites.length,
      ...favorites.filter((favorite) => favorite.id !== service.id),
      service
    );
  }),
  removeFavorite: vi.fn(async (_supabase, _userId, serviceId) => {
    const index = favorites.findIndex((favorite) => favorite.id === serviceId);
    if (index >= 0) {
      favorites.splice(index, 1);
    }
  })
}));

describe("/api/favorites", () => {
  beforeEach(() => {
    vi.resetModules();
    favorites.splice(0, favorites.length);
  });

  it("saves and returns favorites for the authenticated user", async () => {
    const { POST, GET } = await import("@/app/api/favorites/route");

    const saveRequest = new Request("http://localhost/api/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token"
      },
      body: JSON.stringify({
        serviceId: "food-1",
        service: {
          id: "food-1",
          name: "Food Service",
          category: "food",
          address: "1 Main St",
          latitude: 43.65,
          longitude: -79.38,
          sourceType: "manual"
        }
      })
    });

    const saveResponse = await POST(saveRequest);
    expect(saveResponse.status).toBe(200);

    const listRequest = new Request("http://localhost/api/favorites", {
      method: "GET",
      headers: {
        Authorization: "Bearer token"
      }
    });

    const listResponse = await GET(listRequest);
    const payload = (await listResponse.json()) as Array<{ id: string }>;
    expect(payload).toHaveLength(1);
    expect(payload[0]?.id).toBe("food-1");
  });
});
