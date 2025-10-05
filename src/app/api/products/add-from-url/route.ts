import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getOpenAIClient, DEFAULT_AGENT_MODEL } from "@/lib/openaiAgent";
import { productSchema } from "@/schemas/product";
import { scrapeProductPage } from "@/lib/webScraper";
import { ProductDomainService } from '@/lib/products/domainService';
import { isAdminUser } from "@/lib/auth/admin";

const REQUIRE_ADMIN_IMPORT =
  (process.env.PRODUCT_IMPORT_REQUIRE_ADMIN ?? "false").toLowerCase() === "true";
const ENABLE_WEB_SEARCH =
  (process.env.PRODUCT_IMPORT_ENABLE_WEB_SEARCH ?? "true").toLowerCase() === "true";

const requestSchema = z.object({
  sourceUrl: z.string().url(),
  milestoneId: z.string().optional(),
  aiCategoryIds: z.array(z.string()).optional(),
});

const aiExtractionSchema = z.object({
  product: z.object({
    name: z.string(),
    description: z.string().nullable().optional(),
    category: z.string(),
    subcategory: z.string().nullable().optional(),
    brand: z.string().nullable().optional(),
    imageUrl: z.string().url().nullable().optional(),
    priceCents: z.number().int().min(0).nullable().optional(),
    currency: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    ageRangeMonthsMin: z.number().int().min(0).nullable().optional(),
    ageRangeMonthsMax: z.number().int().min(0).nullable().optional(),
    milestoneIds: z.array(z.string()).nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    ecoFriendly: z.boolean().nullable().optional(),
    premium: z.boolean().nullable().optional(),
    rating: z.number().min(0).max(5).nullable().optional(),
    reviewCount: z.number().int().min(0).nullable().optional(),
    affiliateUrl: z.string().url().nullable().optional(),
    inStock: z.boolean().nullable().optional(),
    periodStartMonth: z.number().int().min(-3).max(48).nullable().optional(),
    periodEndMonth: z.number().int().min(-3).max(60).nullable().optional(),
    safetyNotes: z.string().nullable().optional(),
    reviewSources: z.array(z.object({ source: z.string(), url: z.string().url().optional() })).nullable().optional(),
    externalReviewUrls: z.array(z.object({ source: z.string(), url: z.string().url() })).nullable().optional(),
  }),
});

const DEBUG_LOGGING = process.env.NODE_ENV !== "production";

function debugLog(context: string, payload?: Record<string, unknown>) {
  if (!DEBUG_LOGGING) {
    return;
  }

  if (payload) {
    console.log(`[api/products/add-from-url] ${context}`, payload);
  } else {
    console.log(`[api/products/add-from-url] ${context}`);
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (REQUIRE_ADMIN_IMPORT && !isAdminUser(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { sourceUrl, milestoneId, aiCategoryIds } = requestSchema.parse(body);

    debugLog("request.received", {
      userId,
      sourceUrl,
      milestoneId,
      aiCategoryCount: aiCategoryIds?.length ?? 0,
      actorRole: isAdminUser(userId) ? "admin" : "member",
    });

    debugLog("scrape.start", { sourceUrl });
    const scrapedData = await scrapeProductPage(sourceUrl);
    debugLog("scrape.success", { scrapedLength: scrapedData.length });

    const client = getOpenAIClient();
    debugLog("openai.start", { model: DEFAULT_AGENT_MODEL });

    let supplementalSearch: WebSearchContext | null = null;
    if (ENABLE_WEB_SEARCH) {
      supplementalSearch = await collectWebSearchContext({
        client,
        scrapedData,
        sourceUrl,
      });
      debugLog("websearch.context", {
        hasSummary: Boolean(supplementalSearch?.summary),
        sourceCount: supplementalSearch?.sources?.length ?? 0,
      });
    }

    const output = await runProductExtractionChat({
      client,
      scrapedData,
      sourceUrl,
      supplementalSearch,
    });
    debugLog("openai.response", {
      responseLength: output?.length ?? 0,
      usedWebSearch: Boolean(supplementalSearch?.summary),
    });

    if (!output) {
      throw new Error("OpenAI response did not include JSON payload");
    }

    let parsedOutput;
    try {
      parsedOutput = JSON.parse(output);
      debugLog("openai.parse.success", { hasProductKey: Boolean(parsedOutput?.product) });
    } catch (parseError) {
      debugLog("openai.parse.failure", {
        message: parseError instanceof Error ? parseError.message : String(parseError),
        responsePreview: output.slice(0, 500),
      });
      throw new Error(`Failed to parse LLM response as JSON: ${parseError}`);
    }

    // Handle case where LLM returns product directly instead of wrapped in "product" key
    let productData = parsedOutput;
    if (parsedOutput.product) {
      productData = parsedOutput.product;
    }

    const { product } = aiExtractionSchema.parse({ product: productData });
    debugLog("extraction.success", {
      hasImage: Boolean(product.imageUrl),
      milestoneCount: product.milestoneIds?.length ?? 0,
      tagCount: product.tags?.length ?? 0,
    });

    // Clean up empty strings and invalid URLs
    const cleanedProduct = {
      ...product,
      imageUrl: product.imageUrl && product.imageUrl.trim() && product.imageUrl.startsWith('http') ? product.imageUrl : null,
      affiliateUrl: product.affiliateUrl && product.affiliateUrl.trim() && product.affiliateUrl.startsWith('http') ? product.affiliateUrl : null,
      description: product.description && product.description.trim() ? product.description : null,
      subcategory: product.subcategory && product.subcategory.trim() ? product.subcategory : null,
      brand: product.brand && product.brand.trim() ? product.brand : null,
      safetyNotes: product.safetyNotes && product.safetyNotes.trim() ? product.safetyNotes : null,
    };
    debugLog("normalization.applied", {
      hasImage: Boolean(cleanedProduct.imageUrl),
      hasAffiliate: Boolean(cleanedProduct.affiliateUrl),
    });

    const payload = productSchema.parse({
      ...cleanedProduct,
      milestoneIds: product.milestoneIds ?? (milestoneId ? [milestoneId] : []),
      tags: product.tags ?? [],
      ecoFriendly: product.ecoFriendly ?? false,
      premium: product.premium ?? false,
      reviewSources: product.reviewSources ?? [],
      externalReviewUrls: product.externalReviewUrls ?? [],
      aiCategoryIds: aiCategoryIds ?? [],
      sourceUrl,
    });
    debugLog("payload.validated", {
      name: payload.name,
      category: payload.category,
      milestoneIds: payload.milestoneIds,
      tags: payload.tags,
    });

    const created = await ProductDomainService.addProduct(payload, {
      userId,
      interactionType: 'wishlist',
    });
    debugLog("database.insert.success", {
      productId: created.product.id,
      name: created.product.name,
    });
    return NextResponse.json({
      message: "Product added",
      productId: created.product.id,
      product: created.product,
    });
  } catch (error) {
    debugLog("error", {
      errorType: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    if (error instanceof Error && error.message.includes('malformed array literal')) {
      debugLog('error.postgres-array');
    }

    if (
      error instanceof Error &&
      (error.message.includes('Scraping blocked for host') ||
        error.message.includes('Only HTTP(S) URLs') ||
        error.message.includes('Timed out fetching product page'))
    ) {
      return NextResponse.json(
        {
          error: "Invalid product URL",
          details: error.message,
        },
        { status: error.message.includes('Timed out') ? 504 : 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to add product from URL",
        details: error instanceof Error ? error.message : "Unknown error",
        errorType: error?.constructor?.name || 'Unknown',
        timestamp: new Date().toISOString()
      },
      { status: 500 },
    );
  }
}

type WebSearchContext = {
  summary: string;
  sources: Array<{ title?: string; url: string }>;
};

type WebSearchParams = {
  client: ReturnType<typeof getOpenAIClient>;
  scrapedData: string;
  sourceUrl: string;
};

const WEB_SEARCH_MODEL = process.env.OPENAI_RESPONSES_MODEL ?? DEFAULT_AGENT_MODEL;
const WEB_SEARCH_ALLOWED_DOMAINS = (process.env.OPENAI_WEB_SEARCH_ALLOWED_DOMAINS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .slice(0, 20);

async function collectWebSearchContext({
  client,
  scrapedData,
  sourceUrl,
}: WebSearchParams): Promise<WebSearchContext | null> {
  try {
    const response = await client.responses.create({
      model: WEB_SEARCH_MODEL,
      tools: [
        {
          type: "web_search",
          ...(WEB_SEARCH_ALLOWED_DOMAINS.length
            ? {
                filters: {
                  allowed_domains: WEB_SEARCH_ALLOWED_DOMAINS,
                },
              }
            : {}),
        },
      ],
      tool_choice: "auto",
      include: ["web_search_call.action.sources"],
      input: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: "You are a verification assistant. Cross-check baby product details from trusted retailers or manufacturer pages. Return a concise summary under 150 words highlighting any missing price, currency, availability, or image information not already in the scraped payload. End the summary with citations like [1], [2] that correspond to the sources you used.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Research goals:
- Confirm or retrieve product name, brand, pricing (amount + currency), availability text, and high-resolution product images for:
  ${sourceUrl}
- Prefer authoritative sources (manufacturer, retailer). Ignore blog posts or scraped aggregators.
- Highlight fields missing from the scraped payload.

Scraped payload excerpt (first 4000 chars):
${scrapedData.slice(0, 4000)}
`,
            },
          ],
        },
      ],
    });

    const summary = (response as Record<string, unknown>).output_text?.trim();
    if (!summary) {
      return null;
    }

    const sources: Array<{ title?: string; url: string }> = [];
    const actions = (response as { output?: Array<Record<string, unknown>> }).output ?? [];
    for (const action of actions) {
      if (action.type === "web_search_call" && (action as any).action?.sources) {
        const sourceList = (action as any).action.sources as Array<{
          url: string;
          title?: string;
        }>;
        for (const source of sourceList ?? []) {
          if (source?.url) {
            sources.push({ url: source.url, title: source.title });
          }
        }
      }
    }

    return {
      summary,
      sources,
    };
  } catch (error) {
    debugLog("websearch.error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

type ChatExtractionParams = {
  client: ReturnType<typeof getOpenAIClient>;
  scrapedData: string;
  sourceUrl: string;
  supplementalSearch: WebSearchContext | null;
};

async function runProductExtractionChat({
  client,
  scrapedData,
  sourceUrl,
  supplementalSearch,
}: ChatExtractionParams): Promise<string | null | undefined> {
  const systemPrompt = `You are Babyshop's product extraction specialist.
Use the provided scraped payload as the primary source of truth.
Supplemental web-search summaries are optional hints. If they contradict the payload, trust the payload unless you cite the external source.
Always return valid JSON with a top-level "product" object.
Never fabricate fields—set them to null if unknown.
All URLs must be HTTP/HTTPS and resolvable. If you cannot verify a better link, reuse ${sourceUrl} for affiliateUrl.
When using external information, add an entry to product.reviewSources with {"source": "Label", "url": "https://..."}.`;

  const supplementalText = supplementalSearch
    ? `Supplemental web search summary:
${supplementalSearch.summary}

Sources:
${supplementalSearch.sources
        .map((source, index) => `[${index + 1}] ${source.title ?? source.url} (${source.url})`)
        .join('\n') || 'No sources returned.'}`
    : 'Supplemental web search summary: not available.';

  const userPrompt = `Scraped payload:
${scrapedData}

${supplementalText}

Return JSON of the form {
  "product": {
    "name": "...",
    "category": "clothing | feeding | sleeping | safety | travel | play | monitoring | accessories | transportation",
    "subcategory": "... or null",
    "brand": "... or null",
    "description": "... or null",
    "imageUrl": "https://...",
    "affiliateUrl": "https://...",
    "priceNumber": 12.34,
    "priceCents": 1234,
    "currency": "USD",
    "inStock": true,
    "rating": 4.5,
    "reviewCount": 123,
    "ecoFriendly": false,
    "premium": false,
    "tags": ["..."],
    "safetyNotes": "...",
    "milestoneIds": ["..."]
  }
}

Set unknown fields to null and derive priceCents from priceNumber when present.`;

  const response = await client.chat.completions.create({
    model: DEFAULT_AGENT_MODEL,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "product_payload",
        schema: {
          type: "object",
          properties: {
            product: {
              type: "object",
              required: ["name", "category"],
              properties: {
                name: { type: "string" },
                description: { type: ["string", "null"] },
                category: { type: "string" },
                subcategory: { type: ["string", "null"] },
                brand: { type: ["string", "null"] },
                imageUrl: { type: ["string", "null"], format: "uri" },
                affiliateUrl: { type: ["string", "null"], format: "uri" },
                priceNumber: { type: ["number", "null"] },
                priceCents: { type: ["integer", "null"] },
                currency: { type: ["string", "null"] },
                price: { type: ["number", "null"] },
                inStock: { type: ["boolean", "null"] },
                rating: { type: ["number", "null"] },
                reviewCount: { type: ["integer", "null"] },
                ecoFriendly: { type: ["boolean", "null"] },
                premium: { type: ["boolean", "null"] },
                tags: { type: ["array", "null"], items: { type: "string" } },
                safetyNotes: { type: ["string", "null"] },
                milestoneIds: { type: ["array", "null"], items: { type: "string" } },
                reviewSources: {
                  type: ["array", "null"],
                  items: {
                    type: "object",
                    required: ["source"],
                    properties: {
                      source: { type: "string" },
                      url: { type: ["string", "null"], format: "uri" },
                    },
                  },
                },
              },
            },
          },
          required: ["product"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return response.choices[0]?.message?.content;
}
