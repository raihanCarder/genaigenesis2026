import { NextResponse } from "next/server";
import { geocodeLocation } from "@/lib/adapters/google-maps";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      location?: string;
      placeId?: string;
      latitude?: number;
      longitude?: number;
      label?: string;
    };
    const hasCoordinates = Number.isFinite(body.latitude) && Number.isFinite(body.longitude);
    const location = body.location?.trim();
    if (!location && !body.placeId && !hasCoordinates) {
      return NextResponse.json(
        { error: "location, placeId, or latitude/longitude is required." },
        { status: 400 }
      );
    }
    const result = await geocodeLocation({
      location,
      placeId: body.placeId,
      latitude: typeof body.latitude === "number" ? body.latitude : undefined,
      longitude: typeof body.longitude === "number" ? body.longitude : undefined,
      label: body.label?.trim()
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to geocode location." },
      { status: 500 }
    );
  }
}
