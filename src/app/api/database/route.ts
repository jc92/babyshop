import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from "@clerk/nextjs/server";
import { mapBudgetFromDb } from "@/lib/profile/budget";

function isMissingUserProfilesTable(error: unknown): boolean {
  return (
    error instanceof Error &&
    /relation "user_profiles" does not exist/i.test(error.message)
  );
}

function isMissingProfileOverviewsTable(error: unknown): boolean {
  return (
    error instanceof Error &&
    /relation "profile_overviews" does not exist/i.test(error.message)
  );
}

// GET /api/database - Get database schema and stats
export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schemaResult = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles'
      ORDER BY ordinal_position
    `;

    const statsResult = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(DISTINCT user_id) as unique_users,
        MIN(created_at) as first_user,
        MAX(created_at) as latest_user
      FROM user_profiles
    `;

    const sampleResult = await sql`
      SELECT 
        user_id,
        created_at,
        updated_at,
        due_date,
        budget_tier,
        baby_gender,
        color_palette,
        material_focus,
        eco_priority,
        baby_nickname,
        hospital,
        household_setup,
        care_network,
        medical_notes,
        birth_date
      FROM user_profiles 
      ORDER BY created_at DESC 
      LIMIT 3
    `;

    const sampleData = sampleResult.rows.map((row) => ({
      user_id: row.user_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      plan: {
        dueDate: row.due_date,
        budget: mapBudgetFromDb(row.budget_tier),
        babyGender: row.baby_gender,
        colorPalette: row.color_palette,
        materialFocus: row.material_focus,
        ecoPriority: row.eco_priority,
      },
      baby: {
        nickname: row.baby_nickname,
        hospital: row.hospital,
        householdSetup: row.household_setup,
        careNetwork: row.care_network,
        medicalNotes: row.medical_notes,
        birthDate: row.birth_date,
      },
    }));

    return NextResponse.json({ 
      schema: schemaResult.rows,
      stats: statsResult.rows[0],
      sample_data: sampleData,
      current_user: userId
    });
  } catch (error) {
    if (!isMissingUserProfilesTable(error)) {
      console.error('Database error:', error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  try {
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

    const statsResult = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(DISTINCT user_id) as unique_users,
        MIN(created_at) as first_user,
        MAX(created_at) as latest_user
      FROM profile_overviews
    `;

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
    if (!isMissingProfileOverviewsTable(error)) {
      console.error('Database error:', error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  return NextResponse.json({
    schema: [],
    stats: {
      total_users: 0,
      unique_users: 0,
      first_user: null,
      latest_user: null,
    },
    sample_data: [],
    current_user: userId,
  });
}
