import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

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

async function seedProducts() {
  try {
    console.log('🌱 Seeding products...');
    
    // Clear existing products
    await sql`DELETE FROM products`;
    console.log('🗑️ Cleared existing products');

    // Insert sample products
    for (const product of sampleProducts) {
      await sql`
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
          ${product.milestoneIds}, ${product.tags}, ${product.ecoFriendly}, 
          ${product.premium}, ${product.rating}, ${product.reviewCount}, 
          ${product.affiliateUrl}, ${product.inStock}
        )
      `;
    }

    // Get count of products
    const countResult = await sql`SELECT COUNT(*) as total FROM products`;
    console.log(`✅ Seeded ${sampleProducts.length} products`);
    console.log(`📊 Total products in database: ${countResult.rows[0].total}`);

    console.log('\n🎉 Product seeding completed!');
    console.log('🔗 You can now view products in the admin panel');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seedProducts().catch(console.error);
