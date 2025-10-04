import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from '@clerk/nextjs/server';
import { isAdminUser } from "@/lib/auth/admin";

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
    milestoneIds: ["prenatal", "newborn"],
    tags: ["organic", "cotton", "newborn"],
    ecoFriendly: true,
    premium: false,
    rating: 4.5,
    reviewCount: 128,
    affiliateUrl: "https://amazon.com/bodysuit",
    inStock: true,
    aiCategoryIds: ["care-organization"],
    periodStartMonth: 0,
    periodEndMonth: 6,
    reviewSources: [
      { source: "Amazon" },
      { source: "BabyGearLab", url: "https://www.babygearlab.com/topics/clothing/best-baby-onesie" }
    ],
    externalReviewUrls: [
      { source: "BabyGearLab", url: "https://www.babygearlab.com/topics/clothing/best-baby-onesie" }
    ],
    safetyNotes: "Layer over diapers only; avoid loose blankets in crib.",
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
    milestoneIds: ["newborn", "month3", "month6", "month9", "year1"],
    tags: ["monitoring", "safety", "premium"],
    ecoFriendly: false,
    premium: true,
    rating: 4.8,
    reviewCount: 89,
    affiliateUrl: "https://amazon.com/monitor",
    inStock: true,
    aiCategoryIds: ["wellness-monitoring", "mobility-safety"],
    periodStartMonth: 0,
    periodEndMonth: 24,
    reviewSources: [
      { source: "Wirecutter", url: "https://www.nytimes.com/wirecutter/reviews/best-video-baby-monitors/" },
      { source: "Babylist", url: "https://www.babylist.com/hello-baby/best-baby-monitors" }
    ],
    externalReviewUrls: [
      { source: "Wirecutter", url: "https://www.nytimes.com/wirecutter/reviews/best-video-baby-monitors/" },
      { source: "Babylist", url: "https://www.babylist.com/hello-baby/best-baby-monitors" }
    ],
    safetyNotes: "Remind caregivers monitors are not medical devices; keep cords 3ft from crib.",
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
    milestoneIds: ["prenatal", "newborn", "month3"],
    tags: ["eco-friendly", "recycled", "sustainable"],
    ecoFriendly: true,
    premium: false,
    rating: 4.3,
    reviewCount: 67,
    affiliateUrl: "https://amazon.com/diaperbag",
    inStock: true,
    aiCategoryIds: ["care-organization", "travel-ready"],
    periodStartMonth: 0,
    periodEndMonth: 24,
    reviewSources: [
      { source: "Lucie's List", url: "https://www.lucieslist.com/diaper-bags" },
      { source: "Fatherly", url: "https://www.fatherly.com/gear/best-diaper-bags" }
    ],
    externalReviewUrls: [
      { source: "Lucie's List", url: "https://www.lucieslist.com/diaper-bags" },
      { source: "Fatherly", url: "https://www.fatherly.com/gear/best-diaper-bags" }
    ],
    safetyNotes: "Distribute weight evenly to reduce caregiver strain; clip on stroller only if approved by manufacturer.",
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
    milestoneIds: ["prenatal", "newborn", "month3", "month6", "month9", "year1"],
    tags: ["luxury", "premium", "all-terrain"],
    ecoFriendly: false,
    premium: true,
    rating: 4.9,
    reviewCount: 45,
    affiliateUrl: "https://amazon.com/stroller",
    inStock: true,
    aiCategoryIds: ["mobility-safety", "travel-ready"],
    periodStartMonth: 0,
    periodEndMonth: 36,
    reviewSources: [
      { source: "Car Seats for the Littles", url: "https://csftl.org/stroller-safety" },
      { source: "What to Expect", url: "https://www.whattoexpect.com/baby-products/strollers" }
    ],
    externalReviewUrls: [
      { source: "Car Seats for the Littles", url: "https://csftl.org/stroller-safety" },
      { source: "What to Expect", url: "https://www.whattoexpect.com/baby-products/strollers" }
    ],
    safetyNotes: "Encourage CPST car seat check; reference stroller recall registry.",
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
    milestoneIds: ["month6", "month9", "year1"],
    tags: ["organic", "first-foods", "nutrition"],
    ecoFriendly: true,
    premium: false,
    rating: 4.6,
    reviewCount: 156,
    affiliateUrl: "https://amazon.com/babyfood",
    inStock: true,
    aiCategoryIds: ["feeding-tools"],
    periodStartMonth: 4,
    periodEndMonth: 12,
    reviewSources: [
      { source: "Solid Starts", url: "https://solidstarts.com/best-first-foods" },
      { source: "The Bump", url: "https://www.thebump.com/a/best-baby-food" }
    ],
    externalReviewUrls: [
      { source: "Solid Starts", url: "https://solidstarts.com/best-first-foods" },
      { source: "The Bump", url: "https://www.thebump.com/a/best-baby-food" }
    ],
    safetyNotes: "Emphasize pediatrician consult before solids; store pouches refrigerated after opening.",
  }
];

const toTextArrayLiteral = (values?: string[] | null): string => {
  if (!values || values.length === 0) {
    return "{}";
  }
  const escaped = values.map((value) =>
    `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
  );
  return `{${escaped.join(',')}}`;
};

// POST /api/products/seed - Seed the products table with sample data
export async function POST() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminUser(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Clear existing products
    await sql`DELETE FROM products`;

    // Insert sample products
    const insertPromises = sampleProducts.map(async (product) => {
      const result = await sql`
        INSERT INTO products (
          name, description, category, subcategory, brand, image_url,
          price_cents, currency, start_date, end_date, age_range_months_min,
          age_range_months_max, milestone_ids, tags, eco_friendly, premium,
          rating, review_count, affiliate_url, in_stock,
          period_start_month, period_end_month, review_sources, safety_notes, external_review_urls
        ) VALUES (
          ${product.name}, ${product.description}, ${product.category}, 
          ${product.subcategory}, ${product.brand}, ${product.imageUrl},
          ${product.priceCents}, ${product.currency}, ${product.startDate}, 
          ${product.endDate}, ${product.ageRangeMonthsMin}, ${product.ageRangeMonthsMax},
          ${toTextArrayLiteral(product.milestoneIds)}::text[],
          ${toTextArrayLiteral(product.tags)}::text[],
          ${product.ecoFriendly}, 
          ${product.premium}, ${product.rating}, ${product.reviewCount}, 
          ${product.affiliateUrl}, ${product.inStock},
        ${product.periodStartMonth ?? null}, ${product.periodEndMonth ?? null},
          ${JSON.stringify(product.reviewSources ?? [])}, ${product.safetyNotes || null},
          ${JSON.stringify(product.externalReviewUrls ?? [])}
        )
        RETURNING id
      `;

      const insertedProduct = result.rows[0];

      if (insertedProduct && product.aiCategoryIds && product.aiCategoryIds.length > 0) {
        await Promise.all(
          product.aiCategoryIds.map((categoryId) =>
            sql`
              INSERT INTO product_ai_categories (product_id, ai_category_id)
              VALUES (${insertedProduct.id}, ${categoryId})
              ON CONFLICT (product_id, ai_category_id) DO NOTHING
            `,
          ),
        );
      }
    });

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
