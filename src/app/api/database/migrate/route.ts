import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from '@clerk/nextjs/server';
import { isAdminUser } from "@/lib/auth/admin";
import { prepareCoreDatabase } from "@/lib/database/schema";

// POST /api/database/migrate - Create the new database schema
export async function POST() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdminUser(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prepareCoreDatabase();

    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'users',
        'user_profiles',
        'milestones',
        'products',
        'user_product_recommendations',
        'user_product_interactions',
        'advisor_chat_states',
        'ai_categories',
        'product_ai_categories',
        'product_reviews'
      )
      ORDER BY table_name
    `;

    return NextResponse.json({
      message: "Database schema prepared successfully",
      tables: tablesResult.rows.map((row) => row.table_name),
      created_by: userId,
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

  if (!isAdminUser(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Check which tables exist
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_profiles', 'milestones', 'products', 'user_product_recommendations', 'user_product_interactions', 'advisor_chat_states', 'ai_categories', 'product_ai_categories', 'product_reviews')
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
      AND t.table_name IN ('users', 'user_profiles', 'milestones', 'products', 'user_product_recommendations', 'user_product_interactions', 'advisor_chat_states', 'ai_categories', 'product_ai_categories', 'product_reviews')
      ORDER BY t.table_name, c.ordinal_position
    `;

    return NextResponse.json({
      existing_tables: tablesResult.rows.map(row => row.table_name),
      schema: schemaResult.rows,
      status: tablesResult.rows.length === 10 ? 'complete' : 'incomplete'
    });

  } catch (error) {
    console.error('Database status error:', error);
    return NextResponse.json({ error: "Failed to get database status" }, { status: 500 });
  }
}
