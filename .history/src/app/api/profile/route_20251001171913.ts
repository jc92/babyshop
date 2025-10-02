import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { z } from "zod";
import { auth } from '@clerk/nextjs/server';

const profileSchema = z.object({
  plan: z.object({
    dueDate: z.string().optional(),
    babyGender: z.string().optional(),
    budget: z.string().optional(),
    colorPalette: z.string().optional(),
    materialFocus: z.string().optional(),
    ecoPriority: z.boolean().optional(),
  }),
  baby: z.object({
    nickname: z.string().optional(),
    hospital: z.string().optional(),
    provider: z.string().optional(),
    householdSetup: z.string().optional(),
    careNetwork: z.string().optional(),
    medicalNotes: z.string().optional(),
  }),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = profileSchema.parse(body);
  const planJson = JSON.stringify(parsed.plan ?? {});
  const babyJson = JSON.stringify(parsed.baby ?? {});

  await sql`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS profile_overviews (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      plan JSONB NOT NULL,
      baby JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    INSERT INTO profile_overviews (user_id, plan, baby, updated_at)
    VALUES (
      ${userId},
      ${planJson}::jsonb,
      ${babyJson}::jsonb,
      NOW()
    )
    ON CONFLICT (user_id)
    DO UPDATE
      SET plan = EXCLUDED.plan,
          baby = EXCLUDED.baby,
          updated_at = NOW()
  `;

  return NextResponse.json({ status: "saved" });
}

export async function GET() {
  const result =
    await sql`SELECT * FROM profile_overviews WHERE user_id = ${"anonymous"} LIMIT 1`;

  if (result.rows.length === 0) {
    return NextResponse.json({ data: null });
  }

  return NextResponse.json({ data: result.rows[0] });
}

