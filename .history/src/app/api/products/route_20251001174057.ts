import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from '@clerk/nextjs/server';
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  imageUrl: z.string().url().optional(),
  priceCents: z.number().int().min(0).optional(),
  currency: z.string().default('USD'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  ageRangeMonthsMin: z.number().int().min(0).optional(),
  ageRangeMonthsMax: z.number().int().min(0).optional(),
  milestoneIds: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  ecoFriendly: z.boolean().default(false),
  premium: z.boolean().default(false),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).default(0),
  affiliateUrl: z.string().url().optional(),
  inStock: z.boolean().default(true),
});

// POST /api/products - Create a new product
export async function POST(request: Request) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = productSchema.parse(body);

    const result = await sql`
      INSERT INTO products (
        name,
        description,
        category,
        subcategory,
        brand,
        image_url,
        price_cents,
        currency,
        start_date,
        end_date,
        age_range_months_min,
        age_range_months_max,
        milestone_ids,
        tags,
        eco_friendly,
        premium,
        rating,
        review_count,
        affiliate_url,
        in_stock
      ) VALUES (
        ${parsed.name},
        ${parsed.description || null},
        ${parsed.category},
        ${parsed.subcategory || null},
        ${parsed.brand || null},
        ${parsed.imageUrl || null},
        ${parsed.priceCents || null},
        ${parsed.currency},
        ${parsed.startDate || null},
        ${parsed.endDate || null},
        ${parsed.ageRangeMonthsMin || null},
        ${parsed.ageRangeMonthsMax || null},
        ${parsed.milestoneIds || []},
        ${parsed.tags || []},
        ${parsed.ecoFriendly},
        ${parsed.premium},
        ${parsed.rating || null},
        ${parsed.reviewCount},
        ${parsed.affiliateUrl || null},
        ${parsed.inStock}
      )
      RETURNING *
    `;

    return NextResponse.json({ 
      product: result.rows[0],
      message: "Product created successfully"
    });

  } catch (error) {
    console.error('Product creation error:', error);
    return NextResponse.json({ 
      error: "Failed to create product",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/products - Get products with filtering and pagination
export async function GET(request: Request) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const ageMonths = parseInt(searchParams.get('ageMonths') || '0');
    const budgetTier = searchParams.get('budgetTier');
    const ecoFriendly = searchParams.get('ecoFriendly') === 'true';
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    // Build dynamic query
    const whereConditions = ['1=1'];
    const queryParams: unknown[] = [];
    let paramIndex = 1;

    if (category) {
      whereConditions.push(`category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    if (ageMonths > 0) {
      whereConditions.push(`(age_range_months_min IS NULL OR age_range_months_min <= $${paramIndex})`);
      whereConditions.push(`(age_range_months_max IS NULL OR age_range_months_max >= $${paramIndex})`);
      queryParams.push(ageMonths);
      paramIndex++;
    }

    if (budgetTier) {
      if (budgetTier === 'budget' || budgetTier === 'standard') {
        whereConditions.push(`premium = false`);
      } else if (budgetTier === 'premium' || budgetTier === 'luxury') {
        whereConditions.push(`premium = true`);
      }
    }

    if (ecoFriendly) {
      whereConditions.push(`eco_friendly = true`);
    }

    if (search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR brand ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    whereConditions.push(`in_stock = true`);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM products 
      WHERE ${whereConditions.join(' AND ')}
    `;
    const countResult = await sql.query(countQuery, queryParams);

    // Get products
    const productsQuery = `
      SELECT 
        id,
        name,
        description,
        category,
        subcategory,
        brand,
        image_url,
        price_cents,
        currency,
        start_date,
        end_date,
        age_range_months_min,
        age_range_months_max,
        milestone_ids,
        tags,
        eco_friendly,
        premium,
        rating,
        review_count,
        affiliate_url,
        in_stock,
        created_at,
        updated_at
      FROM products 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    const productsResult = await sql.query(productsQuery, queryParams);

    return NextResponse.json({
      products: productsResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
      }
    });

  } catch (error) {
    console.error('Products fetch error:', error);
    return NextResponse.json({ 
      error: "Failed to fetch products",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
