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
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BraveSearch } from "@langchain/community/tools/brave_search";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { RunnableSequence } from "@langchain/core/runnables";

const ClientProfileSchema = z.object({
  demographics: z.string().describe("Age, gender, or family status if mentioned."),
  professionalBackground: z.string().describe("Work history or education."),
  currentAssets: z.array(z.string()).describe("Items they have (e.g., laptop, ID, transit pass)."),
  immediateBarriers: z.array(z.string()).describe("Direct obstacles (e.g., evicted today, no phone)."),
  urgencyLevel: z.enum(["critical", "stable"]).default("critical")
});

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
  propertyOrdering: ["intent", "summary", "recommendedServices", "nextSteps", "verificationWarning"]
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

function fallbackRoadmapResponse(): RoadmapResponse {
  return RoadmapResponseSchema.parse({
    situationSummary: "This roadmap focuses on near-term stability based on your situation.",
    thisWeek: [
      { reason: "Start by calling 211 to confirm the best local support options." }
    ],
    thisMonth: [],
    longerTerm: [],
    notes: [
      "Keep important numbers saved or written down.",
      "Verify appointment hours before traveling to time-sensitive services."
    ],
    verificationWarnings: ["Some service records may be stale or incomplete."]
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

    const parsed = await generateJson<ChatResponse>(
      prompt,
      "ChatResponse",
      chatResponseSchemaDefinition
    );
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

export async function generateRoadmap(rawInput: string): Promise<RoadmapResponse> {
  if (!hasGeminiEnv || !serverEnv.BRAVE_SEARCH_API_KEY) {
    return fallbackRoadmapResponse();
  }

  try {
    const extractorLlm = new ChatGoogleGenerativeAI({
      model: serverEnv.GEMINI_MODEL || "gemini-2.5-flash",
      apiKey: serverEnv.GEMINI_API_KEY,
      temperature: 0, 
    });

    const agentLlm = new ChatGoogleGenerativeAI({
      model: serverEnv.GEMINI_MODEL || "gemini-2.5-flash",
      apiKey: serverEnv.GEMINI_API_KEY,
      temperature: 0.4, // Keep the bump for loop prevention
    });

    const tools = [
      new BraveSearch({ apiKey: serverEnv.BRAVE_SEARCH_API_KEY }),
    ];

    const analyzer = extractorLlm.withStructuredOutput(ClientProfileSchema);

    const roadmapChain = RunnableSequence.from([
      // Step A: Extract directly from the raw string
      async (input: string) => {
        console.log("🔍 Running Analyzer Node...");
        return await analyzer.invoke(`Analyze this crisis background and extract facts: ${input}. If the input is gibberish, empty, or lacks any mention of a crisis (housing, food, jobs), set all fields to 'N/A'. Most importantly, if you cannot identify a city or specific need, set immediateBarriers to ['INSUFFICIENT_DATA'] and urgencyLevel to 'low'`);
      },

      // Step B: Pipe the profile into the Agent
      async (profile) => {
        console.log("🧠 Analyzer Output:", JSON.stringify(profile, null, 2));

        const systemPrompt = `You are a Senior Case Manager in Toronto. Your clients are in high-stress crisis.
        Explain every step as if they have never dealt with the government or social services before.

        CLIENT PROFILE (Extracted Facts):
        - Demographics: ${profile.demographics}
        - Background: ${profile.professionalBackground}
        - Assets: ${profile.currentAssets.join(", ")}
        - Barriers: ${profile.immediateBarriers.join(", ")}
        - Urgency: ${profile.urgencyLevel}

        COMMUNICATION RULES:
        1. DETAILED DEPTH: Every 'reason' MUST be 4-6 sentences long. Do not be brief.
        2. TACTICAL PARAGRAPHS: Write each 'reason' as ONE cohesive paragraph. Do NOT use line breaks (\\n), markdown, or headers inside the JSON string. Weave the instructions, the 'why', and what ID to bring naturally into the sentences.
        3. NO JARGON: Explain terms like "Central Intake" or "Ontario Works" immediately.
        4. VALIDATION: Start the situationSummary with a kind, grounded acknowledgment of their specific background.

        RESEARCH RULES:
        1. USE TOOLS: Search for EXACT physical addresses and subway stations for Toronto offices.
        2. If the user has a degree/skills, search for specialized employment programs.

        OUTPUT RULES:
        {
          "situationSummary": "3-4 sentences of warm, tactical welcome.",
          "thisWeek": [{ "serviceId": "...", "reason": "MUST be 4-6 sentences with specific 'How-To' instructions." }],
          "thisWeek_summary": "A 4-5 word summary of thisWeek.",
          "thisMonth": [...],
          "thisMonth_summary": "A 4-5 word summary of thisMonth.",
          "longerTerm": [...],
          "longerTerm_summary": "A 4-5 word summary of longerTerm.",
          "notes": ["Tips on safety/ID/organization"],
          "verificationWarnings": ["Warnings about hours/verification"]
        }
        CRITICAL: Raw JSON only. No markdown. Fill every array.
        "CRITICAL GUARDRAIL: If the input profile contains 'INSUFFICIENT_DATA' in the barriers list, DO NOT use any tools. Instead, return a JSON response where the situationSummary is a polite request for more details (specifically asking for their city and current crisis). Set thisWeek to a single step explaining why more info is needed to provide safe, local resources. Set all other arrays to empty."`;
        
        const agent = createReactAgent({
          llm: agentLlm,
          tools,
          messageModifier: systemPrompt,
        });

        console.log("🚀 Launching Strategist Agent...");
        // Pass the raw text directly to the agent as the user's message
        return await agent.invoke({
          messages: [["user", `Client's exact words: "${rawInput}"`]]
        });
      }
    ]);

    // Just pass the string directly into the chain!
    const finalResult = await roadmapChain.invoke(rawInput);
    const finalMessage = finalResult.messages[finalResult.messages.length - 1];

    let rawContent = "";
    if (typeof finalMessage.content === "string") {
      rawContent = finalMessage.content;
    } else if (Array.isArray(finalMessage.content)) {
      rawContent = finalMessage.content.map((p: any) => ('text' in p ? p.text : '')).join("");
    }

    // Snipe the JSON to avoid conversational bleed
    let cleanedJson = rawContent.replace(/```json|```/g, "").trim();
    const firstBrace = cleanedJson.indexOf('{');
    const lastBrace = cleanedJson.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(cleanedJson);
    return RoadmapResponseSchema.parse(parsed);

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Agentic Roadmap Failed:", errorMessage);

    if (error.name === "ZodError" && error.issues) {
      console.error("Validation Issues:", JSON.stringify(error.issues, null, 2));
    }

    return fallbackRoadmapResponse();
  }
}