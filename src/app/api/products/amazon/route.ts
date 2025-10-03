import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { AmazonService } from "@/lib/amazonService";
import { ProductDomainService } from '@/lib/products/domainService';
import { productSchema } from "@/schemas/product";

const requestSchema = z.object({
  url: z.string().url(),
  milestoneId: z.string().optional(),
  aiCategoryIds: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { url, milestoneId, aiCategoryIds } = requestSchema.parse(body);

    // Validate Amazon URL
    if (!AmazonService.isValidAmazonUrl(url)) {
      return NextResponse.json({ 
        error: "Invalid Amazon URL. Please provide a valid Amazon product URL." 
      }, { status: 400 });
    }

    console.log(`🛒 Processing Amazon product: ${url}`);
    
    // Extract product data using specialized Amazon service
    const amazonData = await AmazonService.extractAmazonProduct(url);
    console.log(`📦 Extracted Amazon data:`, {
      asin: amazonData.asin,
      title: amazonData.title,
      brand: amazonData.brand,
      price: amazonData.price,
      category: amazonData.category
    });

    // Transform Amazon data to our product schema
    const productPayload = productSchema.parse({
      ...amazonData,
      milestoneIds: amazonData.milestoneIds ?? (milestoneId ? [milestoneId] : []),
      aiCategoryIds: aiCategoryIds ?? [],
    });

    const created = await ProductDomainService.addProduct(productPayload);

    return NextResponse.json({
      message: "Amazon product added successfully",
      productId: created.product.id,
      product: created.product,
      amazonData: {
        asin: amazonData.asin,
        title: amazonData.title,
        brand: amazonData.brand,
        price: amazonData.price,
        category: amazonData.category,
        rating: amazonData.rating,
        reviewCount: amazonData.reviewCount
      }
    });

  } catch (error) {
    console.error('💥 Amazon product extraction error:', error);
    
    return NextResponse.json(
      {
        error: "Failed to extract Amazon product",
        details: error instanceof Error ? error.message : "Unknown error",
        errorType: error?.constructor?.name || 'Unknown',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET endpoint to extract Amazon product data without saving
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
    }

    if (!AmazonService.isValidAmazonUrl(url)) {
      return NextResponse.json({ 
        error: "Invalid Amazon URL. Please provide a valid Amazon product URL." 
      }, { status: 400 });
    }

    console.log(`🔍 Extracting Amazon product data: ${url}`);
    
    const amazonData = await AmazonService.extractAmazonProduct(url);
    
    return NextResponse.json({
      success: true,
      data: amazonData,
      url,
      extractedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Amazon data extraction error:', error);
    
    return NextResponse.json(
      {
        error: "Failed to extract Amazon product data",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
