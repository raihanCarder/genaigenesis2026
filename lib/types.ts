import { z } from "zod";

export const serviceCategories = [
  "food",
  "services",
  "free-food-events",
  "showers",
  "bathrooms",
  "shelters",
  "clinics",
  "legal-help",
  "wifi-charging"
] as const;

export const ServiceCategorySchema = z.enum(serviceCategories);
export const SourceTypeSchema = z.enum(["maps", "scraped", "manual", "open-data"]);
export const FreshnessStateSchema = z.enum(["fresh", "stale", "unknown"]);

export const ServiceSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: ServiceCategorySchema,
  subcategory: z.string().optional(),
  description: z.string().optional(),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  phone: z.string().optional(),
  website: z.string().optional(),
  hoursText: z.string().optional(),
  openNow: z.boolean().optional(),
  eligibilityNotes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sourceType: SourceTypeSchema,
  sourceName: z.string().optional(),
  sourceUrl: z.string().optional(),
  lastVerifiedAt: z.string().optional(),
  freshnessState: FreshnessStateSchema.optional(),
  confidenceScore: z.number().min(0).max(1).optional()
});

export const ServiceWithMetaSchema = ServiceSchema.extend({
  distanceMeters: z.number().optional()
});

export const ChatRecommendationSchema = z.object({
  serviceId: z.string(),
  reason: z.string()
});

export const ChatResponseSchema = z.object({
  summary: z.string(),
  recommendedServices: z.array(ChatRecommendationSchema),
  nextSteps: z.array(z.string()),
  verificationWarning: z.string().optional()
});

export const RoadmapStepSchema = z.object({
  serviceId: z.string().optional(),
  reason: z.string()
});

export const RoadmapResponseSchema = z.object({
  situationSummary: z.string(),
  thisWeek: z.array(RoadmapStepSchema),
  thisMonth: z.array(RoadmapStepSchema),
  longerTerm: z.array(RoadmapStepSchema),
  notes: z.array(z.string()),
  verificationWarnings: z.array(z.string()).optional()
});

export const FavoriteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  serviceId: z.string(),
  savedAt: z.string()
});

export const SessionUserSchema = z.object({
  uid: z.string(),
  displayName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  photoURL: z.string().nullable().optional()
});

export type ServiceCategory = z.infer<typeof ServiceCategorySchema>;
export type SourceType = z.infer<typeof SourceTypeSchema>;
export type FreshnessState = z.infer<typeof FreshnessStateSchema>;
export type Service = z.infer<typeof ServiceSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type RoadmapResponse = z.infer<typeof RoadmapResponseSchema>;
export type Favorite = z.infer<typeof FavoriteSchema>;
export type SessionUser = z.infer<typeof SessionUserSchema>;

export type LocationContext = {
  latitude: number;
  longitude: number;
  label: string;
};

export type ServiceWithMeta = z.infer<typeof ServiceWithMetaSchema>;

export type ChatRequestPayload = {
  message: string;
  location: Pick<LocationContext, "latitude" | "longitude">;
  selectedCategory?: ServiceCategory;
  services: ServiceWithMeta[];
};

export type RoadmapRequestPayload = {
  needs: string[];
  constraints?: Record<string, boolean | string | number | null | undefined>;
  location: Pick<LocationContext, "latitude" | "longitude">;
  services: ServiceWithMeta[];
};
