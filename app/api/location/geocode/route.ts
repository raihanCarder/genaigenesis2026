import { NextResponse } from "next/server";
import { geocodeLocation } from "@/lib/adapters/google-maps";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { location?: string };
    const location = body.location?.trim();
    if (!location) {
      return NextResponse.json({ error: "Location is required." }, { status: 400 });
    }
    const result = await geocodeLocation(location);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to geocode location." },
      { status: 500 }
    );
  }
}

