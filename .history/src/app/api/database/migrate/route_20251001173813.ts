import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from '@clerk/nextjs/server';

// POST /api/database/migrate - Create the new database schema
export async function POST() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Enable required extensions
    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`;
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;

    // 1. Users table - stores Clerk user information
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

    // 2. User profiles table - stores user settings and preferences
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

    // 3. Products table - stores all product information
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

    // 4. User product recommendations - tracks what products are recommended to users
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

    // 5. User product interactions - tracks user actions on products
    await sql`
      CREATE TABLE IF NOT EXISTS user_product_interactions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT REFERENCES users(clerk_id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        interaction_type TEXT CHECK (interaction_type IN ('view', 'like', 'dislike', 'purchase', 'wishlist')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Create indexes for better performance
    await sql`CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_start_date ON products(start_date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_end_date ON products(end_date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_age_range ON products(age_range_months_min, age_range_months_max);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_recommendations_user_id ON user_product_recommendations(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_product_interactions(user_id);`;

    return NextResponse.json({ 
      message: "Database schema created successfully",
      tables: [
        "users",
        "user_profiles", 
        "products",
        "user_product_recommendations",
        "user_product_interactions"
      ],
      created_by: userId
    });

  } catch (error) {
    console.error('Database migration error:', error);
    return NextResponse.json({ 
      error: "Database migration failed", 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/database/migrate - Get current schema status
export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check which tables exist
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_profiles', 'products', 'user_product_recommendations', 'user_product_interactions')
      ORDER BY table_name
    `;

    // Get table schemas
    const schemaResult = await sql`
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public' 
      AND t.table_name IN ('users', 'user_profiles', 'products', 'user_product_recommendations', 'user_product_interactions')
      ORDER BY t.table_name, c.ordinal_position
    `;

    return NextResponse.json({
      existing_tables: tablesResult.rows.map(row => row.table_name),
      schema: schemaResult.rows,
      status: tablesResult.rows.length === 5 ? 'complete' : 'incomplete'
    });

  } catch (error) {
    console.error('Database status error:', error);
    return NextResponse.json({ error: "Failed to get database status" }, { status: 500 });
  }
}
