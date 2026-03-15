import { z } from "zod";

const serverEnvSchema = z.object({
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-1.5-pro"),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional()
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional()
});

export const serverEnv = serverEnvSchema.parse(process.env);
export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
});

export const hasGoogleMapsEnv = Boolean(serverEnv.GOOGLE_MAPS_API_KEY);
export const hasGeminiEnv = Boolean(serverEnv.GEMINI_API_KEY);
export const hasFirebaseAdminEnv = Boolean(
  serverEnv.FIREBASE_PROJECT_ID &&
    serverEnv.FIREBASE_CLIENT_EMAIL &&
    serverEnv.FIREBASE_PRIVATE_KEY
);
export const hasFirebaseClientEnv = Boolean(
  clientEnv.NEXT_PUBLIC_FIREBASE_API_KEY &&
    clientEnv.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    clientEnv.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    clientEnv.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET &&
    clientEnv.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID &&
    clientEnv.NEXT_PUBLIC_FIREBASE_APP_ID
);

if (typeof window === "undefined") {
  console.log("========================================");
  console.log("SERVER BOOT: GEMINI KEY CHECK");
  console.log("KEY START:", process.env.GEMINI_API_KEY?.slice(0, 5) || "NOT FOUND");
  console.log("========================================");
}