import { NextResponse } from "next/server";
import { requireUserFromRequest } from "@/lib/auth/server";
import { listFavorites, removeFavorite, saveFavorite } from "@/lib/services/favorites-store";
import { ServiceWithMetaSchema } from "@/lib/types";

export async function GET(request: Request) {
  try {
    const user = await requireUserFromRequest(request);
    const favorites = await listFavorites(user.uid);
    return NextResponse.json(favorites);
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json(
      { error: status === 401 ? "Authentication required." : "Unable to load favorites." },
      { status }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUserFromRequest(request);
    const body = (await request.json()) as {
      serviceId?: string;
      action?: "save" | "remove";
      service?: unknown;
    };
    if (!body.serviceId) {
      return NextResponse.json({ error: "serviceId is required." }, { status: 400 });
    }
    if (body.action === "remove") {
      await removeFavorite(user.uid, body.serviceId);
      return NextResponse.json({ ok: true });
    }
    const service = ServiceWithMetaSchema.safeParse(body.service);
    if (!service.success) {
      return NextResponse.json(
        { error: "A service snapshot is required to save a favorite." },
        { status: 400 }
      );
    }
    await saveFavorite(user.uid, service.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json(
      { error: status === 401 ? "Authentication required." : "Unable to save favorite." },
      { status }
    );
  }
}
