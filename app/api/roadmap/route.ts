import { NextResponse } from "next/server";
import { generateRoadmap } from "@/lib/adapters/gemini";
import { requireUserFromRequest } from "@/lib/auth/server";
import { RoadmapResponseSchema, ServiceWithMetaSchema, type RoadmapRequestPayload } from "@/lib/types";

export async function POST(request: Request) {
  try {
    //await requireUserFromRequest(request); #Commented out for testing purposes
    const body = (await request.json()) as Partial<RoadmapRequestPayload>;
    if (!body.location || !Array.isArray(body.needs) || !Array.isArray(body.services)) {
      return NextResponse.json({ error: "Invalid roadmap payload." }, { status: 400 });
    }
    const services = ServiceWithMetaSchema.array().parse(body.services.slice(0, 12));
    const response = await generateRoadmap({
    });
    return NextResponse.json(RoadmapResponseSchema.parse(response));
  } catch (error) {
    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json(
      { error: status === 401 ? "Authentication required." : error instanceof Error ? error.message : "Unable to generate roadmap." },
      { status }
    );
  }
}
