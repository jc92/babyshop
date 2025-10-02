import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from '@clerk/nextjs/server';

// Sample product data
const sampleProducts = [
  {
    name: "Organic Cotton Baby Bodysuit",
    description: "Soft, breathable organic cotton bodysuit perfect for newborns",
    category: "clothing",
    subcategory: "bodysuits",
    brand: "Little Me",
    imageUrl: "https://example.com/bodysuit.jpg",
    priceCents: 2499,
    currency: "USD",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    ageRangeMonthsMin: 0,
    ageRangeMonthsMax: 6,
    milestoneIds: ["newborn", "0-3months"],
    tags: ["organic", "cotton", "newborn"],
    ecoFriendly: true,
    premium: false,
    rating: 4.5,
    reviewCount: 128,
    affiliateUrl: "https://amazon.com/bodysuit",
    inStock: true
  },
  {
    name: "Premium Baby Monitor",
    description: "High-definition video monitor with night vision and two-way audio",
    category: "monitoring",
    subcategory: "baby_monitors",
    brand: "BabyTech Pro",
    imageUrl: "https://example.com/monitor.jpg",
    priceCents: 19999,
    currency: "USD",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    ageRangeMonthsMin: 0,
    ageRangeMonthsMax: 36,
    milestoneIds: ["newborn", "0-3months", "3-6months", "6-12months"],
    tags: ["monitoring", "safety", "premium"],
    ecoFriendly: false,
    premium: true,
    rating: 4.8,
    reviewCount: 89,
    affiliateUrl: "https://amazon.com/monitor",
    inStock: true
  },
  {
    name: "Eco-Friendly Diaper Bag",
    description: "Sustainable diaper bag made from recycled materials",
    category: "accessories",
    subcategory: "bags",
    brand: "GreenBaby",
    imageUrl: "https://example.com/diaperbag.jpg",
    priceCents: 7999,
    currency: "USD",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    ageRangeMonthsMin: 0,
    ageRangeMonthsMax: 24,
    milestoneIds: ["newborn", "0-3months", "3-6months"],
    tags: ["eco-friendly", "recycled", "sustainable"],
    ecoFriendly: true,
    premium: false,
    rating: 4.3,
    reviewCount: 67,
    affiliateUrl: "https://amazon.com/diaperbag",
    inStock: true
  },
  {
    name: "Luxury Stroller System",
    description: "Premium stroller with all-terrain wheels and luxury finishes",
    category: "transportation",
    subcategory: "strollers",
    brand: "LuxuryBaby",
    imageUrl: "https://example.com/stroller.jpg",
    priceCents: 89999,
    currency: "USD",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    ageRangeMonthsMin: 0,
    ageRangeMonthsMax: 36,
    milestoneIds: ["newborn", "0-3months", "3-6months", "6-12months"],
    tags: ["luxury", "premium", "all-terrain"],
    ecoFriendly: false,
    premium: true,
    rating: 4.9,
    reviewCount: 45,
    affiliateUrl: "https://amazon.com/stroller",
    inStock: true
  },
  {
    name: "Organic Baby Food Starter Kit",
    description: "Complete set of organic baby food for first foods introduction",
    category: "feeding",
    subcategory: "baby_food",
    brand: "PureBaby",
    imageUrl: "https://example.com/babyfood.jpg",
    priceCents: 4999,
    currency: "USD",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    ageRangeMonthsMin: 4,
    ageRangeMonthsMax: 12,
    milestoneIds: ["4-6months", "6-12months"],
    tags: ["organic", "first-foods", "nutrition"],
    ecoFriendly: true,
    premium: false,
    rating: 4.6,
    reviewCount: 156,
    affiliateUrl: "https://amazon.com/babyfood",
    inStock: true
  }
];

// POST /api/products/seed - Seed the products table with sample data
export async function POST() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Clear existing products
    await sql`DELETE FROM products`;

    // Insert sample products
    const insertPromises = sampleProducts.map(product => 
      sql`
        INSERT INTO products (
          name, description, category, subcategory, brand, image_url,
          price_cents, currency, start_date, end_date, age_range_months_min,
          age_range_months_max, milestone_ids, tags, eco_friendly, premium,
          rating, review_count, affiliate_url, in_stock
        ) VALUES (
          ${product.name}, ${product.description}, ${product.category}, 
          ${product.subcategory}, ${product.brand}, ${product.imageUrl},
          ${product.priceCents}, ${product.currency}, ${product.startDate}, 
          ${product.endDate}, ${product.ageRangeMonthsMin}, ${product.ageRangeMonthsMax},
          ${JSON.stringify(product.milestoneIds)}, ${JSON.stringify(product.tags)}, ${product.ecoFriendly}, 
          ${product.premium}, ${product.rating}, ${product.reviewCount}, 
          ${product.affiliateUrl}, ${product.inStock}
        )
      `
    );

    await Promise.all(insertPromises);

    // Get count of inserted products
    const countResult = await sql`SELECT COUNT(*) as total FROM products`;

    return NextResponse.json({ 
      message: "Products seeded successfully",
      products_inserted: sampleProducts.length,
      total_products: parseInt(countResult.rows[0].total),
      seeded_by: userId
    });

  } catch (error) {
    console.error('Product seeding error:', error);
    return NextResponse.json({ 
      error: "Failed to seed products",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/products/seed - Get seeding status
export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN eco_friendly = true THEN 1 END) as eco_friendly_count,
        COUNT(CASE WHEN premium = true THEN 1 END) as premium_count,
        AVG(rating) as average_rating,
        MIN(created_at) as first_created,
        MAX(created_at) as last_created
      FROM products
    `;

    return NextResponse.json({
      status: "ready",
      stats: result.rows[0],
      seeded_by: userId
    });

  } catch (error) {
    console.error('Seeding status error:', error);
    return NextResponse.json({ error: "Failed to get seeding status" }, { status: 500 });
  }
}
