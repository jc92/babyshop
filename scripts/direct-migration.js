import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...');
    
    // Enable required extensions
    console.log('📦 Enabling extensions...');
    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`;
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;
    console.log('✅ Extensions enabled');

    // 1. Users table - stores Clerk user information
    console.log('👥 Creating users table...');
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        clerk_id TEXT PRIMARY KEY,
        email TEXT,
        first_name TEXT,
        last_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Users table created');

    // 2. User profiles table - stores user settings and preferences
    console.log('⚙️ Creating user_profiles table...');
    await sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT REFERENCES users(clerk_id) ON DELETE CASCADE,
        due_date DATE,
        baby_gender TEXT CHECK (baby_gender IN ('boy', 'girl', 'surprise')),
        budget_tier TEXT CHECK (budget_tier IN ('budget', 'standard', 'premium', 'luxury')),
        color_palette TEXT,
        material_focus TEXT,
        eco_priority BOOLEAN DEFAULT FALSE,
        baby_nickname TEXT,
        hospital TEXT,
        provider TEXT,
        household_setup TEXT,
        care_network TEXT,
        medical_notes TEXT,
        birth_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `;
    console.log('✅ User profiles table created');

    // 3. Products table - stores all product information
    console.log('🛍️ Creating products table...');
    await sql`
      CREATE TABLE IF NOT EXISTS products (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        subcategory TEXT,
        brand TEXT,
        image_url TEXT,
        price_cents INTEGER,
        currency TEXT DEFAULT 'USD',
        start_date DATE,
        end_date DATE,
        age_range_months_min INTEGER,
        age_range_months_max INTEGER,
        milestone_ids TEXT[],
        tags TEXT[],
        eco_friendly BOOLEAN DEFAULT FALSE,
        premium BOOLEAN DEFAULT FALSE,
        rating DECIMAL(3,2),
        review_count INTEGER DEFAULT 0,
        affiliate_url TEXT,
        in_stock BOOLEAN DEFAULT TRUE,
        period_start_month INTEGER,
        period_end_month INTEGER,
        review_sources JSONB DEFAULT '[]'::jsonb,
        safety_notes TEXT,
        external_review_urls JSONB DEFAULT '[]'::jsonb,
        source_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS period_start_month INTEGER;`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS period_end_month INTEGER;`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS review_sources JSONB DEFAULT '[]'::jsonb;`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS safety_notes TEXT;`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS external_review_urls JSONB DEFAULT '[]'::jsonb;`;
    await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS source_url TEXT;`;
    console.log('✅ Products table created');

    console.log('🧭 Creating ai_categories table...');
    await sql`
      CREATE TABLE IF NOT EXISTS ai_categories (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        description TEXT,
        best_practices TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ ai_categories table ready');

    const standardAiCategories = [
      {
        id: 'sleep-support',
        label: 'Sleep Support',
        description: 'Sleep surfaces, bedtime routines, and soothing gear to maintain safe sleep habits.',
        bestPractices: 'Follow AAP safe sleep guidelines, prioritize flat, firm surfaces, avoid loose bedding, and schedule transition reminders for weight/height limits.',
      },
      {
        id: 'feeding-tools',
        label: 'Feeding Tools',
        description: 'Breastfeeding, bottle, and solids gear that supports hydration and nutrition milestones.',
        bestPractices: 'Highlight paced-feeding tips, confirm nipple flow or utensil readiness per pediatric guidance, and surface recall notices for food-contact materials.',
      },
      {
        id: 'mobility-safety',
        label: 'Mobility & Safety',
        description: 'Transportation, baby-wearing, and proofing essentials aligned to motor development windows.',
        bestPractices: 'Reinforce car seat installation checks, encourage CPST consults, and add alerts for baby-proofing before crawling or cruising phases.',
      },
      {
        id: 'play-development',
        label: 'Play & Development',
        description: 'Play gyms, toys, and sensory tools that match cognitive and motor development stages.',
        bestPractices: 'Tag Montessori-style rotation tips, reference tummy-time quotas, and match textures to fine-motor skill progression.',
      },
      {
        id: 'care-organization',
        label: 'Care Organization',
        description: 'Diapering stations, storage, and daily care systems keeping caregivers organized.',
        bestPractices: 'Prompt for stock rotation (wipes, diapers), cite eco-disposal options, and encourage ergonomics to reduce caregiver strain.',
      },
      {
        id: 'wellness-monitoring',
        label: 'Wellness Monitoring',
        description: 'Monitoring tech, health kits, and air-quality tools supporting proactive wellness.',
        bestPractices: 'Frame monitors as caregiver aids (not medical devices), include calibration reminders, and link to pediatric triage guidelines.',
      },
      {
        id: 'travel-ready',
        label: 'Travel & On-the-Go',
        description: 'Strollers, carriers, and grab-and-go kits that simplify outings and travel transitions.',
        bestPractices: 'Encourage pre-trip safety checks, highlight travel-system compatibility, and remind caregivers to monitor temperature during outings.',
      },
    ];

    for (const category of standardAiCategories) {
      await sql`
        INSERT INTO ai_categories (id, label, description, best_practices)
        VALUES (${category.id}, ${category.label}, ${category.description}, ${category.bestPractices})
        ON CONFLICT (id)
        DO UPDATE SET
          label = EXCLUDED.label,
          description = EXCLUDED.description,
          best_practices = EXCLUDED.best_practices,
          updated_at = NOW()
      `;
    }
    console.log('✅ Seeded ai_categories');

    console.log('🔗 Creating product_ai_categories table...');
    await sql`
      CREATE TABLE IF NOT EXISTS product_ai_categories (
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        ai_category_id TEXT REFERENCES ai_categories(id) ON DELETE CASCADE,
        PRIMARY KEY (product_id, ai_category_id)
      )
    `;
    console.log('✅ product_ai_categories table ready');

    console.log('📝 Creating product_reviews table...');
    await sql`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        source TEXT NOT NULL,
        url TEXT,
        headline TEXT,
        summary TEXT,
        rating DECIMAL(3,2),
        author TEXT,
        published_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_product_reviews_source ON product_reviews(source);`;
    console.log('✅ product_reviews table ready');

    // 4. User product recommendations
    console.log('💡 Creating user_product_recommendations table...');
    await sql`
      CREATE TABLE IF NOT EXISTS user_product_recommendations (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT REFERENCES users(clerk_id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        recommendation_score DECIMAL(5,2),
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, product_id)
      )
    `;
    console.log('✅ User product recommendations table created');

    // 5. User product interactions
    console.log('📊 Creating user_product_interactions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS user_product_interactions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT REFERENCES users(clerk_id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        interaction_type TEXT CHECK (interaction_type IN ('view', 'like', 'dislike', 'purchase', 'wishlist')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ User product interactions table created');

    // Create indexes for better performance
    console.log('🔍 Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_start_date ON products(start_date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_end_date ON products(end_date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_age_range ON products(age_range_months_min, age_range_months_max);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_recommendations_user_id ON user_product_recommendations(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_product_interactions(user_id);`;
    console.log('✅ Indexes created');

    // Check what tables exist now
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

    console.log('\n🎉 Migration completed successfully!');
    console.log('📋 Tables in database:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('\n✅ Database is ready for use!');
    console.log('🔗 You can now use the admin panel at: https://babyshop-d1z44bcpk-jc92s-projects.vercel.app/admin-v2');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration().catch(console.error);
