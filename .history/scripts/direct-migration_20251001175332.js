const { sql } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

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
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ Products table created');

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

runMigration();
