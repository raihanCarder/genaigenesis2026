import { hasGeminiEnv, serverEnv } from "@/lib/env";
import { RoadmapResponseSchema, type RoadmapResponse } from "@/lib/types";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BraveSearch } from "@langchain/community/tools/brave_search";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";

const ClientProfileSchema = z.object({
  demographics: z.string().describe("Age, gender, or family status if mentioned."),
  professionalBackground: z.string().describe("Work history or education."),
  currentAssets: z.array(z.string()).describe("Items they have (e.g., laptop, ID, transit pass)."),
  immediateBarriers: z.array(z.string()).describe("Direct obstacles (e.g., evicted today, no phone)."),
  urgencyLevel: z.enum(["critical", "stable"]).default("critical")
});

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

export async function generateRoadmap(rawInput: string): Promise<RoadmapResponse> {
  if (!hasGeminiEnv || !serverEnv.BRAVE_SEARCH_API_KEY) {
    return fallbackRoadmapResponse();
  }

  try {
    const extractorLlm = new ChatGoogleGenerativeAI({
      model: serverEnv.GEMINI_MODEL || "gemini-2.5-flash",
      apiKey: serverEnv.GEMINI_API_KEY,
      temperature: 0
    });

    const agentLlm = new ChatGoogleGenerativeAI({
      model: serverEnv.GEMINI_MODEL || "gemini-2.5-flash",
      apiKey: serverEnv.GEMINI_API_KEY,
      temperature: 0.4
    });

    const tools = [new BraveSearch({ apiKey: serverEnv.BRAVE_SEARCH_API_KEY })];
    const analyzer = extractorLlm.withStructuredOutput(ClientProfileSchema);

    const roadmapChain = RunnableSequence.from([
      async (input: string) =>
        analyzer.invoke(`Analyze this crisis background and extract facts: ${input}`),
      async (profile) => {
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
        CRITICAL: Raw JSON only. No markdown. Fill every array.`;

        const agent = createReactAgent({
          llm: agentLlm,
          tools,
          messageModifier: systemPrompt
        });

        return agent.invoke({
          messages: [["user", `Client's exact words: "${rawInput}"`]]
        });
      }
    ]);

    const finalResult = await roadmapChain.invoke(rawInput);
    const finalMessage = finalResult.messages[finalResult.messages.length - 1];

    let rawContent = "";
    if (typeof finalMessage.content === "string") {
      rawContent = finalMessage.content;
    } else if (Array.isArray(finalMessage.content)) {
      rawContent = finalMessage.content
        .map((part) => (typeof part === "object" && part !== null && "text" in part ? String(part.text ?? "") : ""))
        .join("");
    }

    let cleanedJson = rawContent.replace(/```json|```/g, "").trim();
    const firstBrace = cleanedJson.indexOf("{");
    const lastBrace = cleanedJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanedJson = cleanedJson.substring(firstBrace, lastBrace + 1);
    }

    return RoadmapResponseSchema.parse(JSON.parse(cleanedJson));
  } catch {
    return fallbackRoadmapResponse();
  }
}
