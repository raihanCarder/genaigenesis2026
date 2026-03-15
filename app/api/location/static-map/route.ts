import { NextResponse } from "next/server";
import { hasGoogleMapsEnv, serverEnv } from "@/lib/env";

const STATIC_MAP_TIMEOUT_MS = 4000;

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number(searchParams.get("lat"));
  const longitude = Number(searchParams.get("lng"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "lat and lng are required." }, { status: 400 });
  }

  if (!hasGoogleMapsEnv) {
    return NextResponse.json({ error: "Google Maps is not configured." }, { status: 404 });
  }

  const params = new URLSearchParams({
    center: `${latitude},${longitude}`,
    zoom: "15",
    size: "1200x640",
    scale: "2",
    maptype: "roadmap",
    markers: `color:0xf28c28|${latitude},${longitude}`,
    key: serverEnv.GOOGLE_MAPS_API_KEY ?? ""
  });

  try {
    const response = await fetchWithTimeout(
      `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`,
      {
        cache: "force-cache"
      },
      STATIC_MAP_TIMEOUT_MS
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Unable to load static map." }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") ?? "image/png";
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400"
      }
    });
  } catch {
    return NextResponse.json({ error: "Unable to load static map." }, { status: 502 });
  }
}
