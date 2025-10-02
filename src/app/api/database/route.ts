import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from '@clerk/nextjs/server';

// GET /api/database - Get database schema and stats
export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get table schema
    const schemaResult = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'profile_overviews'
      ORDER BY ordinal_position
    `;

    // Get table stats
    const statsResult = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(DISTINCT user_id) as unique_users,
        MIN(created_at) as first_user,
        MAX(created_at) as latest_user
      FROM profile_overviews
    `;

    // Get sample data (first 3 users)
    const sampleResult = await sql`
      SELECT 
        user_id,
        created_at,
        plan,
        baby
      FROM profile_overviews 
      ORDER BY created_at DESC 
      LIMIT 3
    `;

    return NextResponse.json({ 
      schema: schemaResult.rows,
      stats: statsResult.rows[0],
      sample_data: sampleResult.rows,
      current_user: userId
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
