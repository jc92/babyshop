import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getOpenAIClient } from "@/lib/openaiAgent";
import { ProductDomainService } from "@/lib/products/domainService";

const requestMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
});

const advisorRequestSchema = z.object({
  messages: z.array(requestMessageSchema).min(1),
  profile: z
    .object({
      dueDate: z.string().optional(),
      babyGender: z.string().optional(),
      budget: z.string().optional(),
      colorPalette: z.string().optional(),
      materialFocus: z.string().optional(),
      ecoPriority: z.boolean().optional(),
      babyNickname: z.string().optional(),
      hospital: z.string().optional(),
      householdSetup: z.string().optional(),
      careNetwork: z.string().optional(),
      medicalNotes: z.string().optional(),
      birthDate: z.string().optional(),
    })
    .optional(),
  milestoneId: z.string().optional(),
});

const advisorResponseSchema = z.object({
  reply: z.string().optional(),
  suggestions: z
    .array(
      z.object({
        productId: z.string(),
        reason: z.string().optional(),
        name: z.string().optional(),
        brand: z.string().optional(),
        category: z.string().optional(),
        priceCents: z.number().int().nullable().optional(),
        affiliateUrl: z.string().url().optional(),
        rating: z.number().nullable().optional(),
        reviewCount: z.number().int().nullable().optional(),
        ecoFriendly: z.boolean().nullable().optional(),
        premium: z.boolean().nullable().optional(),
      }),
    )
    .optional(),
  addProductPrompt: z
    .object({
      message: z.string().min(1),
    })
    .optional(),
});

type AdvisorChatMessage = z.infer<typeof requestMessageSchema>;
type AdvisorSuggestion = NonNullable<z.infer<typeof advisorResponseSchema>["suggestions"]>[number];

export const runtime = "nodejs";

function serializeEvent(payload: unknown) {
  return `${JSON.stringify(payload)}\n`;
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsedBody: z.infer<typeof advisorRequestSchema>;

  try {
    const json = await request.json();
    parsedBody = advisorRequestSchema.parse(json);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid request payload",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }

  const milestoneId = parsedBody.milestoneId ?? "prenatal";
  const profile = parsedBody.profile ?? {};

  const catalogResult = await ProductDomainService.query({
    filters: {
      milestoneIds: [milestoneId],
      inStock: true,
    },
    includeAiCategories: true,
    includeReviews: true,
    limit: 12,
  });

  const catalog = catalogResult.products.slice(0, 12).map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    brand: product.brand,
    priceCents: product.price_cents,
    rating: product.rating,
    reviewCount: product.review_count,
    reviewSources: product.review_sources,
    safetyNotes: product.safety_notes,
    milestoneIds: product.milestone_ids,
    aiCategoryIds: (product as { ai_category_ids?: string[] }).ai_category_ids ?? [],
    affiliateUrl: product.affiliate_url,
    ecoFriendly: product.eco_friendly,
    premium: product.premium,
  }));

  const messages: AdvisorChatMessage[] = parsedBody.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const client = getOpenAIClient();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(serializeEvent(payload)));
      };

      try {
        const stageOneMessages = [
          {
            role: "system" as const,
            content: [
              "You are BabyBloom's family-prep advisor. Be warm, factual, and action-oriented.",
              "Keep responses under 110 words total. Use short paragraphs or tight bullet lists (max 3 bullets).",
              "Highlight only the most relevant readiness steps or products. If something can wait, say so in one clause, no explanations beyond that.",
              "Prefer concrete next steps over storytelling. Mention location-relevant context only when it changes availability or services.",
              "If nothing helpful is needed yet, say that confidently in a single sentence instead of trying to fill space.",
            ].join(" "),
          },
          {
            role: "system" as const,
            content: `Customer profile: ${JSON.stringify(profile)} | Active milestone: ${milestoneId}`,
          },
          {
            role: "system" as const,
            content: `Catalog: ${JSON.stringify(catalog)}`,
          },
          ...messages,
        ];

        const streamingCompletion = await client.chat.completions.create({
          model: "gpt-5-chat-latest",
          stream: true,
          messages: stageOneMessages,
        });

        let assistantReply = "";

        for await (const chunk of streamingCompletion) {
          const delta = chunk.choices[0]?.delta?.content;
          if (!delta) {
            continue;
          }

          assistantReply += delta;
          send({ type: "token", value: delta });
        }

        const trimmedReply = assistantReply.trim();
        if (trimmedReply.length === 0) {
          send({ type: "error", value: "Advisor returned an empty response." });
          controller.close();
          return;
        }

        send({ type: "message", value: trimmedReply });

        const stageTwoMessages = [
          {
            role: "system" as const,
            content: [
              "You are BabyBloom's catalog matcher. Return grounded JSON with up to three suggestions.",
              "When the catalog includes a fit, use its product ID.",
              "If it does not, provide an external recommendation with a synthetic productId (e.g., `external:nuna-trvl`) plus name, brand, and an https URL in `url` that shoppers can open.",
              "Keep each `reason` to 18 words or fewer and focus on the single most important benefit.",
              "It is fine to return an empty list if nothing is needed.",
              "If the conversation indicates the customer wants BabyBloom to save or stock an item (for example they ask to add it, plan to buy later, or request follow-up), include `addProductPrompt: { \"message\": string }` with a concise invitation you would tell the customer. Otherwise omit that field.",
            ].join(" "),
          },
          {
            role: "system" as const,
            content: `Catalog: ${JSON.stringify(catalog)}`,
          },
          ...messages,
          {
            role: "assistant" as const,
            content: trimmedReply,
          },
        ];

        const suggestionCompletion = await client.chat.completions.create({
          model: "gpt-5-chat-latest",
          response_format: { type: "json_object" },
          messages: stageTwoMessages,
        });

        const suggestionOutput = suggestionCompletion.choices[0]?.message?.content;

        if (!suggestionOutput) {
          send({ type: "error", value: "Advisor suggestions were empty." });
          controller.close();
          return;
        }

        if (process.env.NODE_ENV !== "production") {
          console.log("[advisor] Suggestion output:", suggestionOutput);
        }

        let parsedResponse: z.infer<typeof advisorResponseSchema> | null = null;

        try {
          const rawJson = JSON.parse(suggestionOutput ?? "{}");

          const normalizedSuggestions: AdvisorSuggestion[] = Array.isArray(rawJson?.suggestions)
            ? rawJson.suggestions
                .map((item: unknown): AdvisorSuggestion | null => {
                  if (typeof item !== "object" || item === null) {
                    return null;
                  }

                  const candidate = item as Record<string, unknown>;
                  const idCandidate = candidate.productId ?? candidate.id;
                  if (typeof idCandidate !== "string" || idCandidate.length === 0) {
                    return null;
                  }

                  const suggestion: AdvisorSuggestion = {
                    productId: idCandidate,
                    reason:
                      typeof candidate.reason === "string"
                        ? candidate.reason
                        : undefined,
                    name: typeof candidate.name === "string" ? candidate.name : undefined,
                    brand: typeof candidate.brand === "string" ? candidate.brand : undefined,
                    category: typeof candidate.category === "string" ? candidate.category : undefined,
                    priceCents:
                      typeof candidate.priceCents === "number"
                        ? Math.round(candidate.priceCents)
                        : typeof candidate.price_cents === "number"
                          ? Math.round(candidate.price_cents)
                          : undefined,
                    affiliateUrl:
                      typeof candidate.affiliateUrl === "string" && candidate.affiliateUrl.startsWith("http")
                        ? candidate.affiliateUrl
                        : typeof candidate.url === "string" && candidate.url.startsWith("http")
                          ? candidate.url
                          : undefined,
                    rating:
                      typeof candidate.rating === "number"
                        ? candidate.rating
                        : undefined,
                    reviewCount:
                      typeof candidate.reviewCount === "number"
                        ? Math.round(candidate.reviewCount)
                        : typeof candidate.review_count === "number"
                          ? Math.round(candidate.review_count)
                          : undefined,
                    ecoFriendly:
                      typeof candidate.ecoFriendly === "boolean"
                        ? candidate.ecoFriendly
                        : undefined,
                    premium:
                      typeof candidate.premium === "boolean"
                        ? candidate.premium
                        : undefined,
                  };
                  return suggestion;
                })
                .filter(
                  (item: AdvisorSuggestion | null): item is AdvisorSuggestion => item !== null,
                )
            : [];

          const rawPrompt = rawJson?.addProductPrompt;
          const normalizedPrompt =
            rawPrompt && typeof rawPrompt === "object" && rawPrompt !== null
              ? (() => {
                  const message = (rawPrompt as Record<string, unknown>).message;
                  if (typeof message !== "string" || message.trim().length === 0) {
                    return undefined;
                  }
                  return { message: message.trim() };
                })()
              : undefined;

          const normalizedPayload = {
            reply: typeof rawJson?.reply === "string" ? rawJson.reply : undefined,
            suggestions: normalizedSuggestions,
            addProductPrompt: normalizedPrompt,
          } satisfies Partial<z.input<typeof advisorResponseSchema>>;

          parsedResponse = advisorResponseSchema.parse(normalizedPayload);
        } catch (error) {
          send({
            type: "error",
            value:
              error instanceof Error ? error.message : "Failed to parse advisor suggestions.",
          });
          controller.close();
          return;
        }

        const finalReply = (parsedResponse?.reply ?? trimmedReply).trim();

        if (finalReply.length === 0) {
          send({ type: "error", value: "Advisor returned an empty response." });
          controller.close();
          return;
        }

        const productLookup = new Map(catalog.map((item) => [item.id, item]));
        const suggestions = (parsedResponse?.suggestions ?? [])
          .map((suggestion) => {
            const product = productLookup.get(suggestion.productId);
            if (product) {
              return {
                productId: product.id,
                name: product.name,
                brand: product.brand,
                category: product.category,
                priceCents: product.priceCents,
                rating: product.rating,
                reviewCount: product.reviewCount,
                affiliateUrl: product.affiliateUrl,
                ecoFriendly: product.ecoFriendly,
                premium: product.premium,
                reason: suggestion.reason ?? "",
              };
            }

            return {
              productId: suggestion.productId,
              name: suggestion.name ?? null,
              brand: suggestion.brand ?? null,
              category: suggestion.category ?? null,
              priceCents: suggestion.priceCents ?? null,
              rating: suggestion.rating ?? null,
              reviewCount: suggestion.reviewCount ?? null,
              affiliateUrl: suggestion.affiliateUrl ?? undefined,
              ecoFriendly: suggestion.ecoFriendly ?? null,
              premium: suggestion.premium ?? null,
              reason: suggestion.reason ?? "",
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item));

        send({
          type: "suggestions",
          value: suggestions,
          reply: finalReply,
          addProductPrompt: parsedResponse?.addProductPrompt?.message ?? null,
        });
        send({ type: "done" });
        controller.close();
      } catch (error) {
        send({
          type: "error",
          value: error instanceof Error ? error.message : "Advisor failed to respond.",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
