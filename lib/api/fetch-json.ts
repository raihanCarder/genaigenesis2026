export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const contentType = response.headers?.get?.("content-type") ?? "application/json";
  const ok = "ok" in response ? response.ok : true;
  const payload =
    contentType.includes("application/json") || contentType.includes("text/json")
      ? await response.json()
      : await response.text();

  if (!ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? String(payload.error)
        : `Request failed with status ${"status" in response ? response.status : "unknown"}`;
    throw new ApiError(message, "status" in response ? response.status : 500, payload);
  }

  return payload as T;
}
