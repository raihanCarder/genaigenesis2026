import { hasGeminiEnv, serverEnv } from "@/lib/env";
import { logWarn } from "@/lib/logger";
import {
  ChatResponseSchema,
  type ChatRequestPayload,
  type ChatResponse,
  type ServiceWithMeta
} from "@/lib/types";
import { formatDistance } from "@/lib/utils";
import { generateGeminiJson } from "@/lib/ai/gemini/client";

const chatResponseSchemaDefinition = {
  type: "OBJECT",
  properties: {
    intent: { type: "STRING", enum: ["relevant", "irrelevant"] },
    summary: { type: "STRING" },
    recommendedServices: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          serviceId: { type: "STRING" },
          reason: { type: "STRING" }
        },
        required: ["serviceId", "reason"],
        propertyOrdering: ["serviceId", "reason"]
      }
    },
    nextSteps: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    verificationWarning: { type: "STRING", nullable: true }
  },
  required: ["intent", "summary", "recommendedServices", "nextSteps"],
  propertyOrdering: [
    "intent",
    "summary",
    "recommendedServices",
    "nextSteps",
    "verificationWarning"
  ]
} as const;

function buildServiceSummary(services: ServiceWithMeta[]) {
  return services.map((service) => ({
    id: service.id,
    name: service.name,
    category: service.category,
    description: service.description,
    address: service.address,
    distance: formatDistance(service.distanceMeters),
    hoursText: service.hoursText,
    openNow: service.openNow,
    phone: service.phone,
    website: service.website,
    freshnessState: service.freshnessState,
    confidenceScore: service.confidenceScore,
    eligibilityNotes: service.eligibilityNotes
  }));
}

function fallbackChatResponse(payload: ChatRequestPayload): ChatResponse {
  const recommendations = payload.services.slice(0, 3);
  return ChatResponseSchema.parse({
    intent: "relevant",
    summary:
      recommendations.length > 0
        ? `Here are the strongest nearby options based on distance, freshness, and fit for "${payload.message}".`
        : "I could not find a matching service in the current dataset. Try broadening the category or checking helplines.",
    recommendedServices: recommendations.map((service) => ({
      serviceId: service.id,
      reason: `${service.name} is ${formatDistance(service.distanceMeters)} away and has ${
        service.freshnessState === "fresh" ? "recently verified" : "limited"
      } data.`
    })),
    nextSteps:
      recommendations.length > 0
        ? [
            "Review the recommended services and pick the closest fit.",
            "Call first if the listing is time-sensitive or marked stale."
          ]
        : ["Call 211 for broader support options if you need help right away."],
    verificationWarning: recommendations.some((service) => service.freshnessState !== "fresh")
      ? "Some records may be stale. Verify hours before traveling."
      : undefined
  });
}

function createIrrelevantChatResponse(locationLabel: string) {
  return ChatResponseSchema.parse({
    intent: "irrelevant",
    summary: `Ask me something related to support services in ${locationLabel}.`,
    recommendedServices: [],
    nextSteps: []
  });
}

export async function generateGroundedChat(payload: ChatRequestPayload) {
  if (!hasGeminiEnv) {
    return fallbackChatResponse(payload);
  }

  try {
    const prompt = [
      "You are a grounded support navigator.",
      "Use only the provided services.",
      "Return only valid JSON.",
      "The JSON must exactly match this shape:",
      '{"intent":"relevant|irrelevant","summary":"string","recommendedServices":[{"serviceId":"string","reason":"string"}],"nextSteps":["string"],"verificationWarning":"string optional"}',
      "The user is asking about local support services near the current location.",
      "If the prompt is unrelated to local support services, food access, shelters, showers, clinics, directions, hours, eligibility, or comparing the provided services, set intent to irrelevant and return no recommendations or next steps.",
      "If the prompt is relevant, set intent to relevant.",
      "Recommend only services from the provided IDs.",
      "If there is one clearly strongest match, return exactly one recommendation.",
      "If there are multiple useful matches, return up to 3 recommendations.",
      "For irrelevant prompts, return an empty recommendedServices array and an empty nextSteps array.",
      "Never invent service names, hours, locations, or eligibility rules.",
      `Current location: ${payload.location.label}`,
      `User question: ${payload.message}`,
      `Selected category: ${payload.selectedCategory ?? "none"}`,
      `Dashboard warnings: ${payload.warnings?.join(" | ") || "none"}`,
      `Services: ${JSON.stringify(buildServiceSummary(payload.services))}`
    ].join("\n");

    const parsed = await generateGeminiJson<ChatResponse>({
      prompt,
      schemaName: "ChatResponse",
      responseSchema: chatResponseSchemaDefinition
    });
    const validated = ChatResponseSchema.parse(parsed);
    const knownIds = new Set(payload.services.map((service) => service.id));
    const recommendedServices = validated.recommendedServices
      .filter((item) => knownIds.has(item.serviceId))
      .slice(0, 3);

    if (validated.intent === "irrelevant") {
      return createIrrelevantChatResponse(payload.location.label);
    }

    if (recommendedServices.length === 0) {
      return fallbackChatResponse(payload);
    }

    return ChatResponseSchema.parse({
      ...validated,
      intent: "relevant",
      recommendedServices
    });
  } catch (error) {
    logWarn("Gemini chat generation fell back to local response", {
      reason: error instanceof Error ? error.message : "Unknown Gemini chat failure",
      model: serverEnv.GEMINI_MODEL
    });
    return fallbackChatResponse(payload);
  }
}
