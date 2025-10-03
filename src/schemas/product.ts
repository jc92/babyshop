import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.string().min(1),
  subcategory: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  priceCents: z.number().int().min(0).nullable().optional(),
  currency: z.string().nullable().optional().default('USD'),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  ageRangeMonthsMin: z.number().int().min(0).nullable().optional(),
  ageRangeMonthsMax: z.number().int().min(0).nullable().optional(),
  milestoneIds: z.array(z.string()).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  ecoFriendly: z.boolean().default(false),
  premium: z.boolean().default(false),
  rating: z.number().min(0).max(5).nullable().optional(),
  reviewCount: z.number().int().min(0).nullable().optional().default(0),
  affiliateUrl: z.string().url().nullable().optional(),
  inStock: z.boolean().nullable().optional().default(true),
  periodStartMonth: z.number().int().min(-3).max(48).nullable().optional(),
  periodEndMonth: z.number().int().min(-3).max(60).nullable().optional(),
  safetyNotes: z.string().optional().nullable(),
  aiCategoryIds: z.array(z.string()).optional(),
  reviewSources: z.array(z.object({ source: z.string(), url: z.string().url().optional() })).optional(),
  externalReviewUrls: z.array(z.object({ source: z.string(), url: z.string().url() })).optional(),
  sourceUrl: z.string().url().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
