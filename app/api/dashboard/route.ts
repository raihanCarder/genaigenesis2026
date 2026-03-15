import { NextResponse } from "next/server";
import { getLocationFromSearchParams } from "@/lib/location";
import { getDashboardPayload } from "@/lib/services/dashboard";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = Number(searchParams.get("lat"));
    const longitude = Number(searchParams.get("lng"));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ error: "lat and lng are required." }, { status: 400 });
    }

    const payload = await getDashboardPayload({
      location: getLocationFromSearchParams(Object.fromEntries(searchParams.entries())),
      radius: searchParams.get("radius") ? Number(searchParams.get("radius")) : undefined
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load dashboard data." },
      { status: 500 }
    );
  }
}
