import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getOpenAIClient, DEFAULT_AGENT_MODEL } from "@/lib/openaiAgent";
import { productSchema } from "@/schemas/product";
import { scrapeProductPage } from "@/lib/webScraper";
import { ProductDomainService } from '@/lib/products/domainService';
import { isAdminUser } from "@/lib/auth/admin";

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

  if (!isAdminUser(userId)) {
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
    });

    debugLog("scrape.start", { sourceUrl });
    const scrapedData = await scrapeProductPage(sourceUrl);
    debugLog("scrape.success", { scrapedLength: scrapedData.length });

    const client = getOpenAIClient();
    debugLog("openai.start", { model: DEFAULT_AGENT_MODEL });

    const startTime = Date.now();
    const response = await client.chat.completions.create({
      model: DEFAULT_AGENT_MODEL,
      messages: [
        {
          role: "system",
          content: "You extract structured baby-product data from scraped webpage content. Return a JSON object with a 'product' key containing the extracted data. Only use facts present in the scraped data. If you are unsure or a field is not available, set it to null. For URLs, only include them if they are valid HTTP/HTTPS URLs (not localhost or relative paths). For prices, convert to cents (multiply by 100). For baby products, categorize as: clothing, feeding, sleeping, safety, travel, play, monitoring, accessories, or transportation. For imageUrl, prioritize high-quality product images over thumbnails or placeholders. For affiliateUrl, use the original product page URL if no affiliate link is found.",
        },
        {
          role: "user",
          content: `Please extract product information from this scraped webpage data: ${scrapedData}. Return JSON in this format: {"product": {"name": "Product Name", "category": "clothing", "brand": "Brand Name", "priceCents": 2500, "description": "Product description", "imageUrl": "https://...", "affiliateUrl": "https://...", "rating": 4.5, "reviewCount": 100, "ecoFriendly": true, "premium": false, "inStock": true, "safetyNotes": "Safety information", "milestoneIds": ["month3"], "tags": ["organic", "cotton"]}}. Focus on: name, category, brand, price, description, and any safety features. IMPORTANT: For imageUrl, find the highest quality product image (not thumbnails or placeholders). For affiliateUrl, use the original product page URL (${sourceUrl}) if no affiliate link is found. Only include URLs that are valid HTTP/HTTPS links.`,
        },
      ],
      response_format: {
        type: "json_object",
      },
    });

    const endTime = Date.now();
    debugLog("openai.success", { durationMs: endTime - startTime });

    const output = response.choices[0]?.message?.content;
    debugLog("openai.response", { responseLength: output?.length ?? 0 });

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

    const created = await ProductDomainService.addProduct(payload);
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
