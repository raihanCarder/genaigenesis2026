import { hasGeminiEnv, serverEnv } from "@/lib/env";
import { logWarn } from "@/lib/logger";
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

const chatResponseSchemaDefinition = {
  type: "OBJECT",
  properties: {
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
  required: ["summary", "recommendedServices", "nextSteps"],
  propertyOrdering: ["summary", "recommendedServices", "nextSteps", "verificationWarning"]
} as const;

const roadmapResponseSchemaDefinition = {
  type: "OBJECT",
  properties: {
    situationSummary: { type: "STRING" },
    thisWeek: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          serviceId: { type: "STRING", nullable: true },
          reason: { type: "STRING" }
        },
        required: ["reason"],
        propertyOrdering: ["serviceId", "reason"]
      }
    },
    thisMonth: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          serviceId: { type: "STRING", nullable: true },
          reason: { type: "STRING" }
        },
        required: ["reason"],
        propertyOrdering: ["serviceId", "reason"]
      }
    },
    longerTerm: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          serviceId: { type: "STRING", nullable: true },
          reason: { type: "STRING" }
        },
        required: ["reason"],
        propertyOrdering: ["serviceId", "reason"]
      }
    },
    notes: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    verificationWarnings: {
      type: "ARRAY",
      items: { type: "STRING" }
    }
  },
  required: ["situationSummary", "thisWeek", "thisMonth", "longerTerm", "notes", "verificationWarnings"],
  propertyOrdering: [
    "situationSummary",
    "thisWeek",
    "thisMonth",
    "longerTerm",
    "notes",
    "verificationWarnings"
  ]
} as const;

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

async function generateJson<T>(
  prompt: string,
  schemaName: string,
  responseSchema?: Record<string, unknown>
) {
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
          ...(responseSchema ? { responseSchema } : {}),
          temperature: 0.5
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
    const errorBody = await response.text();
    console.error("Gemini request failed:", errorBody);
    throw new Error(`Gemini request failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```json|```/g, "").trim();
  if (!text) {
    throw new Error(`Gemini did not return content for ${schemaName}.`);
  }
  const parsed = safeJsonParse<T>(text);
  if (parsed === null) {
    throw new Error(`Gemini returned invalid JSON for ${schemaName}: ${text.slice(0, 300)}`);
  }
  return parsed;
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
      '{"summary":"string","recommendedServices":[{"serviceId":"string","reason":"string"}],"nextSteps":["string"],"verificationWarning":"string optional"}',
      "Never invent service names, hours, locations, or eligibility rules.",
      `User question: ${payload.message}`,
      `Selected category: ${payload.selectedCategory ?? "none"}`,
      `Services: ${JSON.stringify(buildServiceSummary(payload.services))}`
    ].join("\n");

    const parsed = await generateJson<ChatResponse>(
      prompt,
      "ChatResponse",
      chatResponseSchemaDefinition
    );
    const validated = ChatResponseSchema.parse(parsed);
    const knownIds = new Set(payload.services.map((service) => service.id));
    return ChatResponseSchema.parse({
      ...validated,
      recommendedServices: validated.recommendedServices.filter((item) => knownIds.has(item.serviceId))
    });
  } catch (error) {
    logWarn("Gemini chat generation fell back to local response", {
      reason: error instanceof Error ? error.message : "Unknown Gemini chat failure",
      model: serverEnv.GEMINI_MODEL
    });
    return fallbackChatResponse(payload);
  }
}

export async function generateRoadmap(payload: RoadmapRequestPayload) {
  if (!hasGeminiEnv) {
    return fallbackRoadmapResponse(payload);
  }
  try {
    const prompt = [
      "You are an expert, empathetic social worker generating a highly detailed stability roadmap.",
      "Output MUST be valid JSON matching this exact structure: { \"situationSummary\": string, \"thisWeek\": [{ \"serviceId\": string, \"reason\": string }], \"thisMonth\": [...], \"longerTerm\": [...], \"notes\": [string], \"verificationWarnings\": [string] }",
      "RULES FOR TAILORING:",
      "1. CONTEXT SYNTHESIS: You must deeply analyze the 'User Constraints/Background' field. Tailor the entire roadmap to their specific qualifications, history, and barriers.",
      "2. situationSummary MUST be a robust 3-4 sentence paragraph acknowledging their specific background (e.g., leveraging their degree or past experience) while validating their current crisis.",
      "3. 'thisWeek' MUST focus strictly on immediate survival and stability using ONLY the provided Service IDs.",
      "4. For general advice in 'thisMonth' and 'longerTerm' where you don't have a specific service, YOU MUST STILL USE THE OBJECT FORMAT: { \"reason\": \"Your detailed, actionable advice here\" }.",
      "5. Do not use markdown formatting or backticks.",
      "6. Give specific instructions on what the user should do, when they should do it, what exactly they need to do, why this step matters, and what to do if these plans fail.",
      `User Needs: ${payload.needs.join(", ")}`,
      `User Constraints/Background: ${JSON.stringify(payload.constraints ?? {})}`,
      `Services Available: ${JSON.stringify(buildServiceSummary(payload.services))}`
    ].join("\n");
    const parsed = await generateJson<RoadmapResponse>(
      prompt,
      "RoadmapResponse",
      roadmapResponseSchemaDefinition
    );
    const validated = RoadmapResponseSchema.parse(parsed);
    const knownIds = new Set(payload.services.map((service) => service.id));
    const sanitize = <T extends Array<{ serviceId?: string; reason: string }>>(steps: T) =>
      steps.filter((step) => !step.serviceId || knownIds.has(step.serviceId)) as T;

    const verificationWarnings = new Set(validated.verificationWarnings ?? []);
    if (payload.services.some((service) => service.freshnessState !== "fresh")) {
      verificationWarnings.add("Some service records may be stale or incomplete.");
    }

    return RoadmapResponseSchema.parse({
      ...validated,
      thisWeek: sanitize(validated.thisWeek),
      thisMonth: sanitize(validated.thisMonth),
      longerTerm: sanitize(validated.longerTerm),
      verificationWarnings: Array.from(verificationWarnings)
    });
  } catch (error) {
    console.error("ALARM - AI FAILED:", error); 
    return fallbackRoadmapResponse(payload);
}
}
