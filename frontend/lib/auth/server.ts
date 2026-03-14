import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAdminAuth } from "@/lib/adapters/firebase-admin";

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length);
}

export async function requireUserFromRequest(request: Request): Promise<DecodedIdToken> {
  const token = getBearerToken(request);
  if (!token) {
    throw new Error("Unauthorized");
  }
  const auth = getFirebaseAdminAuth();
  if (!auth) {
    throw new Error("Firebase admin is not configured.");
  }
  return auth.verifyIdToken(token);
}

