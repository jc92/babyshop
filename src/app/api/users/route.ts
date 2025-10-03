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

function isMissingUsersTable(error: unknown): boolean {
  return (
    error instanceof Error &&
    /relation "users" does not exist/i.test(error.message)
  );
}

// GET /api/users - Get all users (admin only)
export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sql`
      SELECT
        user_id,
        created_at,
        updated_at,
        due_date,
        budget_tier,
        baby_gender,
        baby_nickname,
        hospital
      FROM user_profiles
      ORDER BY created_at DESC
    `;

    const users = result.rows.map((row) => ({
      user_id: row.user_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      due_date: row.due_date,
      budget: mapBudgetFromDb(row.budget_tier) ?? null,
      baby_gender: row.baby_gender,
      baby_nickname: row.baby_nickname,
      hospital: row.hospital,
    }));

    return NextResponse.json({
      users,
      total: users.length,
      current_user: userId,
    });
  } catch (error) {
    if (!isMissingUserProfilesTable(error)) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  try {
    const legacyResult = await sql`
      SELECT 
        user_id,
        created_at,
        updated_at,
        plan->>'dueDate' as due_date,
        plan->>'budget' as budget,
        plan->>'babyGender' as baby_gender,
        baby->>'nickname' as baby_nickname,
        baby->>'hospital' as hospital
      FROM profile_overviews 
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      users: legacyResult.rows,
      total: legacyResult.rows.length,
      current_user: userId,
    });
  } catch (error) {
    if (!isMissingProfileOverviewsTable(error)) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  return NextResponse.json({ users: [], total: 0, current_user: userId });
}

// DELETE /api/users - Clear all user data (admin only)
export async function DELETE() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await sql`DELETE FROM user_profiles`;
  } catch (error) {
    if (!isMissingUserProfilesTable(error)) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  try {
    await sql`DELETE FROM users`;
  } catch (error) {
    if (!isMissingUsersTable(error)) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  try {
    await sql`DELETE FROM profile_overviews`;
  } catch (error) {
    if (!isMissingProfileOverviewsTable(error)) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  return NextResponse.json({
    message: "All user data cleared",
    cleared_by: userId,
  });
}
