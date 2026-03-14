import { NextResponse } from "next/server";
import { generateGroundedChat } from "@/lib/adapters/gemini";
import { ChatResponseSchema, ServiceWithMetaSchema, type ChatRequestPayload } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ChatRequestPayload>;
    if (!body.message || !body.location || !Array.isArray(body.services)) {
      return NextResponse.json({ error: "Invalid chat payload." }, { status: 400 });
    }
    const services = ServiceWithMetaSchema.array().parse(body.services.slice(0, 12));
    const response = await generateGroundedChat({
      message: body.message,
      location: body.location,
      selectedCategory: body.selectedCategory,
      services
    });
    return NextResponse.json(ChatResponseSchema.parse(response));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate chat response." },
      { status: 500 }
    );
  }
}
