import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { sql } from "@vercel/postgres";
import { getOpenAIClient, DEFAULT_AGENT_MODEL } from "@/lib/openaiAgent";

const requestSchema = z.object({
  milestoneId: z.string(),
  budget: z.string().optional(),
  ecoPriority: z.boolean().optional(),
  style: z.string().optional(),
  userId: z.string().optional(),
});

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = requestSchema.parse(body);

    const milestoneProducts = await sql`
      SELECT 
        p.id,
        p.name,
        p.category,
        p.brand,
        p.price_cents,
        p.currency,
        p.milestone_ids,
        p.review_sources,
        p.rating,
        p.review_count,
        p.safety_notes,
        p.external_review_urls,
        COALESCE(json_agg(DISTINCT pac.ai_category_id) FILTER (WHERE pac.ai_category_id IS NOT NULL), '[]'::json) AS ai_category_ids,
        COALESCE(json_agg(DISTINCT to_jsonb(pr)) FILTER (WHERE pr.id IS NOT NULL), '[]'::json) AS reviews
      FROM products p
      LEFT JOIN product_ai_categories pac ON pac.product_id = p.id
      LEFT JOIN product_reviews pr ON pr.product_id = p.id
      WHERE p.milestone_ids @> ARRAY[${parsed.milestoneId}]
      GROUP BY p.id;`;

    const aiCategories = await sql`
      SELECT id, label, description, best_practices
      FROM ai_categories
    `;

    const client = getOpenAIClient();
    console.log(`🤖 Making AI recommendations request with model: ${DEFAULT_AGENT_MODEL}`);
    console.log(`📊 Found ${milestoneProducts.rows.length} products for milestone: ${parsed.milestoneId}`);
    console.log(`🏷️ Found ${aiCategories.rows.length} AI categories`);
    
    const startTime = Date.now();
    const agentResponse = await client.chat.completions.create({
      model: DEFAULT_AGENT_MODEL,
      messages: [
        {
          role: "system",
          content: "You are Nestlings Planner's curation agent. Create milestone-specific product bundles using the provided catalog. Always ground recommendations in the supplied data—especially aiCategories.best_practices, product.review_sources, review summaries, and safety_notes. If information is missing, note the gap instead of inventing details.",
        },
        {
          role: "user",
          content: `Data: ${JSON.stringify({
            milestoneId: parsed.milestoneId,
            profile: {
              budget: parsed.budget,
              ecoPriority: parsed.ecoPriority,
              style: parsed.style,
            },
            catalog: milestoneProducts.rows,
            aiCategories: aiCategories.rows,
          })}\n\nReturn JSON with keys: period, categories (array), each category has id, label, bestPractices, products (array with id, score, why, reviewHighlights, safetyChecklist).`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "MilestoneProductCuration",
          schema: {
            type: "object",
            properties: {
              period: { type: "string" },
              categories: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    label: { type: "string" },
                    bestPractices: { type: "string" },
                    products: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          score: { type: "number" },
                          why: { type: "string" },
                          reviewHighlights: {
                            type: "array",
                            items: { type: "string" },
                          },
                          safetyChecklist: {
                            type: "array",
                            items: { type: "string" },
                          },
                        },
                        required: ["id", "score", "why"],
                      },
                    },
                  },
                  required: ["id", "label", "products"],
                },
              },
              notes: {
                type: "object",
                properties: {
                  budgetGuardrails: { type: "string" },
                  upcoming: { type: "string" },
                },
              },
            },
            required: ["period", "categories"],
          },
        },
      },
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`⏱️ AI recommendations request completed in ${duration}ms`);
    
    let parsedResponse = null;
    const outputText = agentResponse.choices[0]?.message?.content;
    console.log(`📤 AI response length: ${outputText?.length || 0} characters`);
    
    if (outputText) {
      try {
        parsedResponse = JSON.parse(outputText);
        console.log("✅ Successfully parsed AI recommendations response");
      } catch (parseError) {
        console.error("❌ Failed to parse AI recommendations JSON:", parseError);
        console.error("Raw AI response:", outputText);
      }
    }

    console.log("🎉 AI recommendations completed successfully");
    return NextResponse.json({
      period: parsedResponse?.period ?? parsed.milestoneId,
      categories: parsedResponse?.categories ?? [],
      notes: parsedResponse?.notes ?? {},
    });
  } catch (error) {
    console.error("AI recommendation error:", error);
    return NextResponse.json({
      error: "Failed to generate recommendations",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
