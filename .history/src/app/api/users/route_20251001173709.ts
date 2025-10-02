import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from '@clerk/nextjs/server';

// GET /api/users - Get all users (admin only)
export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all users from the database
    const result = await sql`
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
      users: result.rows,
      total: result.rows.length,
      current_user: userId
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

// DELETE /api/users - Clear all user data (admin only)
export async function DELETE() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await sql`DELETE FROM profile_overviews`;
    
    return NextResponse.json({ 
      message: "All user data cleared",
      cleared_by: userId
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
