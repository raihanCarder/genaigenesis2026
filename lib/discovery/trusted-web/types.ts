import { z } from "zod";

export const WebDiscoveryCandidateSchema = z.object({
  name: z.string(),
  category: z.enum(["food", "free-food-events", "showers", "shelters", "services", "clinics"]),
  address: z.string().optional(),
  description: z.string().optional(),
  hoursText: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  eligibilityNotes: z.string().optional()
});

export type WebDiscoveryCandidate = z.infer<typeof WebDiscoveryCandidateSchema>;

export type DiscoveryResult = {
  services: import("@/lib/types").Service[];
  warnings: string[];
};
