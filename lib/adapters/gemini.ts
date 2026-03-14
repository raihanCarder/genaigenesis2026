import { hasGeminiEnv, serverEnv } from "@/lib/env";
import { logError } from "@/lib/logger";
import {
  ChatResponseSchema,
  RoadmapResponseSchema,
  type ChatRequestPayload,
  type ChatResponse,
  type RoadmapRequestPayload,
  type RoadmapResponse,
  type ServiceWithMeta
} from "@/lib/types";
import { formatDistance, safeJsonParse } from "@/lib/utils";

function buildServiceSummary(services: ServiceWithMeta[]) {
  return services.slice(0, 10).map((service) => ({
    id: service.id,
    name: service.name,
    category: service.category,
    address: service.address,
    distance: formatDistance(service.distanceMeters),
    hoursText: service.hoursText,
    openNow: service.openNow,
    freshnessState: service.freshnessState,
    confidenceScore: service.confidenceScore,
    eligibilityNotes: service.eligibilityNotes
  }));
}

function fallbackChatResponse(payload: ChatRequestPayload): ChatResponse {
  const recommendations = payload.services.slice(0, 3);
  return ChatResponseSchema.parse({
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

function fallbackRoadmapResponse(payload: RoadmapRequestPayload): RoadmapResponse {
  const [first, second, third] = payload.services;
  return RoadmapResponseSchema.parse({
    situationSummary: `This roadmap focuses on near-term stability priorities based on: ${payload.needs.join(", ")}.`,
    thisWeek: [
      first
        ? {
            serviceId: first.id,
            reason: `Start with ${first.name} because it is nearby and directly relevant.`
          }
        : { reason: "Start by calling 211 to confirm the best local support options." }
    ],
    thisMonth: second
      ? [
          {
            serviceId: second.id,
            reason: `Use ${second.name} as the next step to stabilize access to support.`
          }
        ]
      : [],
    longerTerm: third
      ? [
          {
            serviceId: third.id,
            reason: `Keep ${third.name} in your plan for longer-term follow-up and stability.`
          }
        ]
      : [],
    notes: [
      "Keep important numbers saved or written down.",
      "Verify appointment hours before traveling to time-sensitive services."
    ],
    verificationWarnings: payload.services.some((service) => service.freshnessState !== "fresh")
      ? ["Some service records may be stale or incomplete."]
      : []
  });
}

async function generateJson<T>(prompt: string, schemaName: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${serverEnv.GEMINI_MODEL}:generateContent?key=${serverEnv.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      }),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`Gemini did not return content for ${schemaName}.`);
  }
  return safeJsonParse<T>(text);
}

export async function generateGroundedChat(payload: ChatRequestPayload) {
  if (!hasGeminiEnv) {
    return fallbackChatResponse(payload);
  }
  try {
    const prompt = [
      "You are a grounded support navigator.",
      "Use only the provided services.",
      "Return strict JSON matching ChatResponse.",
      "Never invent service names, hours, locations, or eligibility rules.",
      `User question: ${payload.message}`,
      `Selected category: ${payload.selectedCategory ?? "none"}`,
      `Services: ${JSON.stringify(buildServiceSummary(payload.services))}`
    ].join("\n");

    const parsed = await generateJson<ChatResponse>(prompt, "ChatResponse");
    const validated = ChatResponseSchema.parse(parsed);
    const knownIds = new Set(payload.services.map((service) => service.id));
    return ChatResponseSchema.parse({
      ...validated,
      recommendedServices: validated.recommendedServices.filter((item) => knownIds.has(item.serviceId))
    });
  } catch (error) {
    logError("Gemini chat generation failed", error);
    return fallbackChatResponse(payload);
  }
}

export async function generateRoadmap(payload: RoadmapRequestPayload) {
  if (!hasGeminiEnv) {
    return fallbackRoadmapResponse(payload);
  }
  try {
    const prompt = [
      "You are generating a stability roadmap for an authenticated user.",
      "Use only the provided services when referencing serviceId values.",
      "Return strict JSON matching RoadmapResponse.",
      "Focus on this week, this month, and longer term.",
      `Needs: ${payload.needs.join(", ")}`,
      `Constraints: ${JSON.stringify(payload.constraints ?? {})}`,
      `Services: ${JSON.stringify(buildServiceSummary(payload.services))}`
    ].join("\n");
    const parsed = await generateJson<RoadmapResponse>(prompt, "RoadmapResponse");
    const validated = RoadmapResponseSchema.parse(parsed);
    const knownIds = new Set(payload.services.map((service) => service.id));
    const sanitize = <T extends Array<{ serviceId?: string; reason: string }>>(steps: T) =>
      steps.filter((step) => !step.serviceId || knownIds.has(step.serviceId)) as T;
    return RoadmapResponseSchema.parse({
      ...validated,
      thisWeek: sanitize(validated.thisWeek),
      thisMonth: sanitize(validated.thisMonth),
      longerTerm: sanitize(validated.longerTerm)
    });
  } catch (error) {
    logError("Gemini roadmap generation failed", error);
    return fallbackRoadmapResponse(payload);
  }
}

