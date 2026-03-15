import { serverEnv } from "@/lib/env";
import { logError } from "@/lib/logger";

export function usesLegacyPlacesApi() {
  return serverEnv.GOOGLE_PLACES_API_FLAVOR === "legacy";
}

export async function buildPlacesApiError(endpoint: string, response: Response) {
  const rawBody = await response.text();
  let detail = rawBody.trim();

  if (rawBody) {
    try {
      const parsed = JSON.parse(rawBody) as {
        error?: { message?: string; status?: string };
      };
      const message = parsed.error?.message;
      const status = parsed.error?.status;
      detail = [status, message].filter(Boolean).join(": ") || detail;
    } catch {
      // Preserve raw payload when Google does not return JSON.
    }
  }

  return new Error(
    `${endpoint} failed with ${response.status}${detail ? ` (${detail})` : ""}`
  );
}

export function buildLegacyPlacesStatusError(
  endpoint: string,
  payload: {
    status?: string;
    error_message?: string;
  }
) {
  const detail = [payload.status, payload.error_message].filter(Boolean).join(": ");
  return new Error(`${endpoint} failed${detail ? ` (${detail})` : ""}`);
}

export function shouldDisablePlacesFromLegacyStatus(status?: string) {
  return status === "REQUEST_DENIED";
}

export function logPlacesApiFailure(
  endpoint: string,
  error: unknown,
  context?: Record<string, unknown>
) {
  logError(
    `${endpoint} failed. Check that Places API is enabled for this key and that billing and key restrictions allow Places requests.`,
    error,
    {
      googlePlacesApiFlavor: serverEnv.GOOGLE_PLACES_API_FLAVOR,
      ...context
    }
  );
}
