import { NextResponse } from "next/server";
import { z } from "zod";
import { generateGroundedChat } from "@/lib/adapters/gemini";
import {
  ChatResponseSchema,
  LocationContextSchema,
  ServiceCategorySchema,
  ServiceWithMetaSchema
} from "@/lib/types";

const ChatRequestBodySchema = z.object({
  message: z.string().trim().min(1),
  location: LocationContextSchema,
  selectedCategory: ServiceCategorySchema.optional(),
  services: ServiceWithMetaSchema.array(),
  warnings: z.array(z.string()).optional()
});

export async function POST(request: Request) {
  try {
    const body = ChatRequestBodySchema.parse(await request.json());
    const response = await generateGroundedChat({
      ...body,
      warnings: body.warnings ?? []
    });
    return NextResponse.json(ChatResponseSchema.parse(response));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid chat payload." }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate chat response." },
      { status: 500 }
    );
  }
}
