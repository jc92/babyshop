import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getOpenAIClient } from "@/lib/openaiAgent";
import { productSchema } from "@/schemas/product";
import { ProductDomainService } from "@/lib/products/domainService";
import { isAdminUser } from "@/lib/auth/admin";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
});

const profileSchema = z.object({
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
});

const requestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  profile: profileSchema.optional(),
  milestoneId: z.string().optional(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminUser(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let parsedBody: z.infer<typeof requestSchema>;

  try {
    const json = await request.json();
    parsedBody = requestSchema.parse(json);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid request payload",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }

  const client = getOpenAIClient();
  const milestoneId = parsedBody.milestoneId ?? "prenatal";

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-5-chat-latest",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are Nestlings Planner's product curator. Use the conversation to gather product information. Respond with JSON: {\"product\": {...}} matching the provided schema. Do not fabricate unknown fields—set them to null. Always include name, category, and milestoneIds (use provided milestone if none mentioned).",
        },
        {
          role: "system",
          content: `Milestone context: ${milestoneId}. Profile: ${JSON.stringify(parsedBody.profile ?? {})}`,
        },
        {
          role: "user",
          content: `Conversation transcript: ${JSON.stringify(parsedBody.messages)}. Return only JSON as {"product": {"name": string, "description": string|null, "category": string, "subcategory": string|null, "brand": string|null, "imageUrl": string|null, "priceCents": number|null, "currency": string|null, "startDate": string|null, "endDate": string|null, "ageRangeMonthsMin": number|null, "ageRangeMonthsMax": number|null, "milestoneIds": string[]|null, "tags": string[]|null, "ecoFriendly": boolean|null, "premium": boolean|null, "rating": number|null, "reviewCount": number|null, "affiliateUrl": string|null, "inStock": boolean|null, "periodStartMonth": number|null, "periodEndMonth": number|null, "safetyNotes": string|null, "aiCategoryIds": string[]|null, "reviewSources": Array<{source: string, url?: string}>|null, "externalReviewUrls": Array<{source: string, url: string}>|null, "sourceUrl": string|null}}.`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Advisor did not return product data." },
        { status: 500 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      return NextResponse.json(
        {
          error: "Failed to parse advisor response",
          details: error instanceof Error ? error.message : String(error),
          raw: content,
        },
        { status: 500 },
      );
    }

    const productPayload = (parsed as { product?: unknown }).product ?? parsed;

    const rawProduct =
      typeof productPayload === "object" && productPayload !== null
        ? (productPayload as Record<string, unknown>)
        : {};

    const rawMilestoneIds = rawProduct["milestoneIds"];
    const normalizedMilestoneIds = Array.isArray(rawMilestoneIds)
      ? rawMilestoneIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [];

    const rawTags = rawProduct["tags"];
    const normalizedTags = Array.isArray(rawTags)
      ? rawTags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
      : [];

    const rawAiCategoryIds = rawProduct["aiCategoryIds"];
    const normalizedAiCategoryIds = Array.isArray(rawAiCategoryIds)
      ? rawAiCategoryIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [];

    const normalizedPayload = productSchema.parse({
      ...rawProduct,
      milestoneIds: normalizedMilestoneIds.length > 0 ? normalizedMilestoneIds : [milestoneId],
      tags: normalizedTags,
      aiCategoryIds: normalizedAiCategoryIds,
    });

    const result = await ProductDomainService.addProduct(normalizedPayload);

    return NextResponse.json({
      message: "Product created",
      product: result.product,
    });
  } catch (error) {
    console.error("advisor add product error", error);
    return NextResponse.json(
      {
        error: "Failed to add product",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
