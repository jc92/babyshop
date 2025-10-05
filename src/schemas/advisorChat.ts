import { z } from "zod";

export const advisorSuggestionSchema = z.object({
  productId: z.string(),
  name: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  priceCents: z.number().nullable().optional(),
  rating: z.number().nullable().optional(),
  reviewCount: z.number().nullable().optional(),
  affiliateUrl: z.string().url().nullable().optional(),
  ecoFriendly: z.boolean().nullable().optional(),
  premium: z.boolean().nullable().optional(),
  reason: z.string().optional(),
});

export const advisorChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  suggestions: z.array(advisorSuggestionSchema).optional(),
  error: z.boolean().optional(),
  addProductSourceUrl: z.string().nullable().optional(),
  addProductPrompt: z.string().nullable().optional(),
});

export const advisorChatStateSchema = z.object({
  isOpen: z.boolean().default(false),
  inputValue: z.string().default(""),
  milestoneId: z.string().min(1).default("prenatal"),
  messages: z.array(advisorChatMessageSchema).default([]),
});

export type AdvisorSuggestion = z.infer<typeof advisorSuggestionSchema>;
export type AdvisorChatMessage = z.infer<typeof advisorChatMessageSchema>;
export type AdvisorChatState = z.infer<typeof advisorChatStateSchema>;
