import { NextResponse } from "next/server";
import { getServiceById, searchServices } from "@/lib/services/query";
import { ServiceCategorySchema } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number(searchParams.get("lat"));
  const longitude = Number(searchParams.get("lng"));
  const id = searchParams.get("id");
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "lat and lng are required." }, { status: 400 });
  }

  if (id) {
    const service = await getServiceById({ id, latitude, longitude });
    if (!service) {
      return NextResponse.json({ error: "Service not found." }, { status: 404 });
    }
    return NextResponse.json(service);
  }

  const categoryParam = searchParams.get("category");
  const radiusParam = searchParams.get("radius");
  const openNow = searchParams.get("openNow") === "true";
  const parsedCategory = categoryParam ? ServiceCategorySchema.safeParse(categoryParam) : null;
  if (categoryParam && !parsedCategory?.success) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  const services = await searchServices({
    latitude,
    longitude,
    category: parsedCategory?.success ? parsedCategory.data : undefined,
    radius: radiusParam ? Number(radiusParam) : undefined,
    openNow
  });
  return NextResponse.json(services);
}

