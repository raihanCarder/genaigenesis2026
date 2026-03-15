import { NextResponse } from "next/server";
import { z } from "zod";
import { generateRoadmap } from "@/lib/adapters/gemini";
import { requireUserFromRequest } from "@/lib/auth/server";
import { buildRoadmapGenerationInput, buildRoadmapView } from "@/lib/roadmap";
import {
  RoadmapRequestPayloadSchema,
  RoadmapViewSchema
} from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    await requireUserFromRequest(request);

    const body = RoadmapRequestPayloadSchema.parse(await request.json());
    const payload = {
      ...body,
      services: body.services.slice(0, 12)
    };
    const response = await generateRoadmap(buildRoadmapGenerationInput(payload));

    return NextResponse.json(
      RoadmapViewSchema.parse(buildRoadmapView(response, payload.services))
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid roadmap payload." }, { status: 400 });
    }

    const status = error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json(
      { error: status === 401 ? "Authentication required." : error instanceof Error ? error.message : "Unable to generate roadmap." },
      { status }
    );
  }
}