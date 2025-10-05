import { NextResponse } from "next/server";
import { auth } from '@clerk/nextjs/server';
import { productSchema } from "@/schemas/product";
import { ProductDomainService, ProductNotFoundError } from '@/lib/products/domainService';
import type { ProductQueryOptions } from '@/lib/products/types';

// POST /api/products - Create a new product
export async function POST(request: Request) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = productSchema.parse(body);
    const result = await ProductDomainService.addProduct(parsed, {
      userId,
      interactionType: 'wishlist',
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Product creation error:', error);
    return NextResponse.json({ 
      error: "Failed to create product",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/products - Get products with advanced filtering and pagination
export async function GET(request: Request) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const queryOptions: ProductQueryOptions = {};
    const filters: ProductQueryOptions['filters'] = {};
    const { searchParams } = new URL(request.url);

    const getBool = (key: string) => {
      const value = searchParams.get(key);
      if (value === null) return undefined;
      return value === 'true';
    };

    const getNumber = (key: string) => {
      const value = searchParams.get(key);
      if (!value) return undefined;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    };

    const getArray = (key: string) => {
      const value = searchParams.get(key);
      return value ? value.split(',').filter(Boolean) : undefined;
    };

    const page = getNumber('page');
    const limit = getNumber('limit');

    if (page) queryOptions.page = Math.max(1, page);
    if (limit) queryOptions.limit = Math.min(100, Math.max(1, limit));

    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder');

    if (sortBy) queryOptions.sortBy = sortBy as ProductQueryOptions['sortBy'];
    if (sortOrder) queryOptions.sortOrder = sortOrder as ProductQueryOptions['sortOrder'];

    queryOptions.includeReviews = getBool('includeReviews');
    queryOptions.includeAiCategories = getBool('includeAiCategories');

    const category = searchParams.get('category');
    const categories = getArray('categories');

    if (categories) {
      filters.category = categories;
    } else if (category) {
      filters.category = category;
    }

    const milestoneId = searchParams.get('milestoneId');
    const milestoneIds = getArray('milestoneIds');

    if (milestoneIds) {
      filters.milestoneIds = milestoneIds;
    } else if (milestoneId) {
      filters.milestoneIds = milestoneId;
    }

    filters.ageMonths = getNumber('ageMonths');
    filters.minPrice = getNumber('minPrice');
    filters.maxPrice = getNumber('maxPrice');
    filters.minRating = getNumber('minRating');
    filters.budgetTier = searchParams.get('budgetTier') || undefined;
    filters.search = searchParams.get('search') || undefined;
    filters.ecoFriendly = getBool('ecoFriendly');
    filters.premium = getBool('premium');

    const inStock = getBool('inStock');
    if (typeof inStock === 'boolean') {
      filters.inStock = inStock;
    }

    queryOptions.filters = filters;

    const result = await ProductDomainService.query(queryOptions);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Products fetch error:', error);
    return NextResponse.json({ 
      error: "Failed to fetch products",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Missing product id" }, { status: 400 });
    }

    try {
      const result = await ProductDomainService.deleteProduct(id);
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof ProductNotFoundError) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Product deletion error:', error);
    return NextResponse.json(
      {
        error: "Failed to delete product",
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
