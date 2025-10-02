import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from '@clerk/nextjs/server';
import { z } from "zod";

const profileSchema = z.object({
  dueDate: z.string().optional(),
  babyGender: z.enum(['boy', 'girl', 'surprise']).optional(),
  budgetTier: z.enum(['budget', 'standard', 'premium', 'luxury']).optional(),
  colorPalette: z.string().optional(),
  materialFocus: z.string().optional(),
  ecoPriority: z.boolean().optional(),
  babyNickname: z.string().optional(),
  hospital: z.string().optional(),
  provider: z.string().optional(),
  householdSetup: z.string().optional(),
  careNetwork: z.string().optional(),
  medicalNotes: z.string().optional(),
  birthDate: z.string().optional(),
});

// POST /api/users/profile - Create or update user profile
export async function POST(request: Request) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = profileSchema.parse(body);

    // First, ensure the user exists in the users table
    await sql`
      INSERT INTO users (clerk_id, created_at, updated_at)
      VALUES (${userId}, NOW(), NOW())
      ON CONFLICT (clerk_id) DO UPDATE SET updated_at = NOW()
    `;

    // Insert or update user profile
    const result = await sql`
      INSERT INTO user_profiles (
        user_id,
        due_date,
        baby_gender,
        budget_tier,
        color_palette,
        material_focus,
        eco_priority,
        baby_nickname,
        hospital,
        provider,
        household_setup,
        care_network,
        medical_notes,
        birth_date,
        updated_at
      ) VALUES (
        ${userId},
        ${parsed.dueDate || null},
        ${parsed.babyGender || null},
        ${parsed.budgetTier || null},
        ${parsed.colorPalette || null},
        ${parsed.materialFocus || null},
        ${parsed.ecoPriority || false},
        ${parsed.babyNickname || null},
        ${parsed.hospital || null},
        ${parsed.provider || null},
        ${parsed.householdSetup || null},
        ${parsed.careNetwork || null},
        ${parsed.medicalNotes || null},
        ${parsed.birthDate || null},
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        due_date = EXCLUDED.due_date,
        baby_gender = EXCLUDED.baby_gender,
        budget_tier = EXCLUDED.budget_tier,
        color_palette = EXCLUDED.color_palette,
        material_focus = EXCLUDED.material_focus,
        eco_priority = EXCLUDED.eco_priority,
        baby_nickname = EXCLUDED.baby_nickname,
        hospital = EXCLUDED.hospital,
        provider = EXCLUDED.provider,
        household_setup = EXCLUDED.household_setup,
        care_network = EXCLUDED.care_network,
        medical_notes = EXCLUDED.medical_notes,
        birth_date = EXCLUDED.birth_date,
        updated_at = NOW()
      RETURNING *
    `;

    return NextResponse.json({ 
      status: "saved",
      profile: result.rows[0]
    });

  } catch (error) {
    console.error('Profile save error:', error);
    return NextResponse.json({ 
      error: "Failed to save profile",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/users/profile - Get user profile
export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sql`
      SELECT 
        up.*,
        u.email,
        u.first_name,
        u.last_name,
        u.created_at as user_created_at
      FROM user_profiles up
      JOIN users u ON up.user_id = u.clerk_id
      WHERE up.user_id = ${userId}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: result.rows[0] });

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ 
      error: "Failed to fetch profile",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
