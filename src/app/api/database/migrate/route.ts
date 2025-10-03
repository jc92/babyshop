import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from '@clerk/nextjs/server';
import { milestoneSeedData } from "@/data/catalog";

const standardAiCategories = [
  {
    id: "sleep-support",
    label: "Sleep Support",
    description: "Sleep surfaces, bedtime routines, and soothing gear to maintain safe sleep habits.",
    bestPractices:
      "Follow AAP safe sleep guidelines, prioritize flat, firm surfaces, avoid loose bedding, and schedule transition reminders for weight/height limits.",
  },
  {
    id: "feeding-tools",
    label: "Feeding Tools",
    description: "Breastfeeding, bottle, and solids gear that supports hydration and nutrition milestones.",
    bestPractices:
      "Highlight paced-feeding tips, confirm nipple flow or utensil readiness per pediatric guidance, and surface recall notices for food-contact materials.",
  },
  {
    id: "mobility-safety",
    label: "Mobility & Safety",
    description: "Transportation, baby-wearing, and proofing essentials aligned to motor development windows.",
    bestPractices:
      "Reinforce car seat installation checks, encourage CPST consults, and add alerts for baby-proofing before crawling or cruising phases.",
  },
  {
    id: "play-development",
    label: "Play & Development",
    description: "Play gyms, toys, and sensory tools that match cognitive and motor development stages.",
    bestPractices:
      "Tag Montessori-style rotation tips, reference tummy-time quotas, and match textures to fine-motor skill progression.",
  },
  {
    id: "care-organization",
    label: "Care Organization",
    description: "Diapering stations, storage, and daily care systems keeping caregivers organized.",
    bestPractices:
      "Prompt for stock rotation (wipes, diapers), cite eco-disposal options, and encourage ergonomics to reduce caregiver strain.",
  },
  {
    id: "wellness-monitoring",
    label: "Wellness Monitoring",
    description: "Monitoring tech, health kits, and air-quality tools supporting proactive wellness.",
    bestPractices:
      "Frame monitors as caregiver aids (not medical devices), include calibration reminders, and link to pediatric triage guidelines.",
  },
  {
    id: "travel-ready",
    label: "Travel & On-the-Go",
    description: "Strollers, carriers, and grab-and-go kits that simplify outings and travel transitions.",
    bestPractices:
      "Encourage pre-trip safety checks, highlight travel-system compatibility, and remind caregivers to monitor temperature during outings.",
  },
];

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
        baby_name TEXT,
        baby_nickname TEXT,
        hospital TEXT,
        provider TEXT,
        household_setup TEXT,
        care_network TEXT,
        medical_notes TEXT,
        birth_date DATE,
        location TEXT,
        parent_one_name TEXT,
        parent_two_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `;

    await sql`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS location TEXT;`;
    await sql`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS baby_name TEXT;`;
    await sql`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS parent_one_name TEXT;`;
    await sql`ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS parent_two_name TEXT;`;

    // 3. Milestones table - stores development phases for grouping products and timelines
    await sql`
      CREATE TABLE IF NOT EXISTS milestones (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        description TEXT NOT NULL,
        month_start INTEGER NOT NULL,
        month_end INTEGER NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        summary TEXT,
        baby_focus TEXT[],
        caregiver_focus TEXT[],
        environment_focus TEXT[],
        health_checklist TEXT[],
        planning_tips TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`ALTER TABLE milestones ADD COLUMN IF NOT EXISTS summary TEXT;`;
    await sql`ALTER TABLE milestones ADD COLUMN IF NOT EXISTS baby_focus TEXT[];`;
    await sql`ALTER TABLE milestones ADD COLUMN IF NOT EXISTS caregiver_focus TEXT[];`;
    await sql`ALTER TABLE milestones ADD COLUMN IF NOT EXISTS environment_focus TEXT[];`;
    await sql`ALTER TABLE milestones ADD COLUMN IF NOT EXISTS health_checklist TEXT[];`;
    await sql`ALTER TABLE milestones ADD COLUMN IF NOT EXISTS planning_tips TEXT[];`;

    const toTextArrayLiteral = (values?: string[] | null): string => {
      if (!values || values.length === 0) {
        return "{}";
      }
      const escaped = values.map((value) =>
        `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
      );
      return `{${escaped.join(',')}}`;
    };

    for (const milestone of milestoneSeedData) {
      await sql`
        INSERT INTO milestones (
          id,
          label,
          description,
          month_start,
          month_end,
          sort_order,
          summary,
          baby_focus,
          caregiver_focus,
          environment_focus,
          health_checklist,
          planning_tips,
          updated_at
        )
        VALUES (
          ${milestone.id},
          ${milestone.label},
          ${milestone.description},
          ${milestone.monthRange[0]},
          ${milestone.monthRange[1]},
          ${milestone.sortOrder ?? 0},
          ${milestone.summary ?? null},
          ${toTextArrayLiteral(milestone.babyFocus)}::text[],
          ${toTextArrayLiteral(milestone.caregiverFocus)}::text[],
          ${toTextArrayLiteral(milestone.environmentFocus)}::text[],
          ${toTextArrayLiteral(milestone.healthChecklist)}::text[],
          ${toTextArrayLiteral(milestone.planningTips)}::text[],
          NOW()
        )
        ON CONFLICT (id)
        DO UPDATE SET
          label = EXCLUDED.label,
          description = EXCLUDED.description,
          month_start = EXCLUDED.month_start,
          month_end = EXCLUDED.month_end,
          sort_order = EXCLUDED.sort_order,
          summary = EXCLUDED.summary,
          baby_focus = EXCLUDED.baby_focus,
          caregiver_focus = EXCLUDED.caregiver_focus,
          environment_focus = EXCLUDED.environment_focus,
          health_checklist = EXCLUDED.health_checklist,
          planning_tips = EXCLUDED.planning_tips,
          updated_at = NOW()
      `;
    }

    // 4. Products table - stores all product information
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

    // 3b. AI categories reference table
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

    // Seed standard AI categories if missing
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

    // 3c. Join table between products and AI categories
    await sql`
      CREATE TABLE IF NOT EXISTS product_ai_categories (
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        ai_category_id TEXT REFERENCES ai_categories(id) ON DELETE CASCADE,
        PRIMARY KEY (product_id, ai_category_id)
      )
    `;

    // 3d. Product reviews sourced from external content
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

    // 5. User product recommendations - tracks what products are recommended to users
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

    // 6. User product interactions - tracks user actions on products
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
    await sql`CREATE INDEX IF NOT EXISTS idx_products_period ON products(period_start_month, period_end_month);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_product_ai_categories_category ON product_ai_categories(ai_category_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_recommendations_user_id ON user_product_recommendations(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_product_interactions(user_id);`;

    return NextResponse.json({ 
      message: "Database schema created successfully",
      tables: [
        "users",
        "user_profiles", 
        "milestones",
        "products",
        "user_product_recommendations",
        "user_product_interactions",
        "ai_categories",
        "product_ai_categories",
        "product_reviews"
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
      AND table_name IN ('users', 'user_profiles', 'milestones', 'products', 'user_product_recommendations', 'user_product_interactions', 'ai_categories', 'product_ai_categories', 'product_reviews')
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
      AND t.table_name IN ('users', 'user_profiles', 'milestones', 'products', 'user_product_recommendations', 'user_product_interactions', 'ai_categories', 'product_ai_categories', 'product_reviews')
      ORDER BY t.table_name, c.ordinal_position
    `;

    return NextResponse.json({
      existing_tables: tablesResult.rows.map(row => row.table_name),
      schema: schemaResult.rows,
      status: tablesResult.rows.length === 9 ? 'complete' : 'incomplete'
    });

  } catch (error) {
    console.error('Database status error:', error);
    return NextResponse.json({ error: "Failed to get database status" }, { status: 500 });
  }
}
