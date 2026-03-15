import { serverEnv } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/shared/fetch-with-timeout";
import { safeJsonParse } from "@/lib/utils";

type GeminiResponseSchema = Record<string, unknown>;

export async function generateGeminiJson<T>(input: {
  prompt: string;
  schemaName: string;
  responseSchema?: GeminiResponseSchema;
  temperature?: number;
  timeoutMs?: number;
}) {
  const requestInit: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      generationConfig: {
        responseMimeType: "application/json",
        ...(input.responseSchema ? { responseSchema: input.responseSchema } : {}),
        temperature: input.temperature ?? 0.5
      },
      contents: [
        {
          role: "user",
          parts: [{ text: input.prompt }]
        }
      ]
    }),
    cache: "no-store"
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${serverEnv.GEMINI_MODEL}:generateContent?key=${serverEnv.GEMINI_API_KEY}`;
  const response = input.timeoutMs
    ? await fetchWithTimeout(endpoint, requestInit, input.timeoutMs)
    : await fetch(endpoint, requestInit);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `${input.schemaName} request failed with ${response.status}${errorBody ? `: ${errorBody}` : ""}`
    );
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text
    ?.replace(/```json|```/g, "")
    .trim();

  if (!text) {
    throw new Error(`Gemini did not return content for ${input.schemaName}.`);
  }

  const parsed = safeJsonParse<T>(text);
  if (parsed === null) {
    throw new Error(
      `Gemini returned invalid JSON for ${input.schemaName}: ${text.slice(0, 300)}`
    );
  }

  return parsed;
}
