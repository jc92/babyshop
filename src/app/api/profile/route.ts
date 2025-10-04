import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { mapBudgetFromDb, mapBudgetToDb } from "@/lib/profile/budget";
import { toIsoDateString } from "@/lib/dateCalculations";

const profileSchema = z.object({
  plan: z.object({
    dueDate: z.string().optional(),
    babyGender: z.string().optional(),
    budget: z.string().optional(),
    colorPalette: z.string().optional(),
    materialFocus: z.string().optional(),
    ecoPriority: z.boolean().optional(),
    location: z.string().optional(),
  }),
  baby: z.object({
    name: z.string().optional(),
    nickname: z.string().optional(),
    hospital: z.string().optional(),
    provider: z.string().optional(),
    householdSetup: z.string().optional(),
    careNetwork: z.string().optional(),
    medicalNotes: z.string().optional(),
    birthDate: z.string().optional(),
    parentOneName: z.string().optional(),
    parentTwoName: z.string().optional(),
  }),
});

type PlanInput = z.infer<typeof profileSchema>["plan"];
type BabyInput = z.infer<typeof profileSchema>["baby"];

type ProfileRow = {
  user_id: string;
  due_date: string | null;
  baby_gender: string | null;
  budget_tier: string | null;
  color_palette: string | null;
  material_focus: string | null;
  eco_priority: boolean | null;
  location: string | null;
  baby_name: string | null;
  baby_nickname: string | null;
  hospital: string | null;
  provider: string | null;
  household_setup: string | null;
  care_network: string | null;
  medical_notes: string | null;
  birth_date: string | null;
  parent_one_name: string | null;
  parent_two_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type LegacyProfileRow = {
  plan: Record<string, unknown> | null;
  baby: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

function normalizeText(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDate(value?: string | null): string | null {
  return toIsoDateString(value);
}

function isMissingProfileOverviewsTable(error: unknown): boolean {
  return (
    error instanceof Error &&
    /relation "profile_overviews" does not exist/i.test(error.message)
  );
}

function isMissingUserProfilesTable(error: unknown): boolean {
  return (
    error instanceof Error &&
    /relation "user_profiles" does not exist/i.test(error.message)
  );
}

function isMissingUsersTable(error: unknown): boolean {
  return (
    error instanceof Error &&
    /relation "users" does not exist/i.test(error.message)
  );
}

class ProfileTablesNotReadyError extends Error {
  constructor(message: string = "Profile tables are not available") {
    super(message);
    this.name = "ProfileTablesNotReadyError";
  }
}

function rethrowIfProfileTablesMissing(error: unknown): never {
  if (
    isMissingUserProfilesTable(error) ||
    isMissingUsersTable(error) ||
    isMissingProfileOverviewsTable(error)
  ) {
    throw new ProfileTablesNotReadyError(
      "Profile tables are missing. Run the database setup before accessing profile data.",
    );
  }

  throw error;
}

async function upsertUserProfile(userId: string, plan: PlanInput, baby: BabyInput) {
  const dueDate = normalizeDate(plan.dueDate);
  const babyGender = normalizeText(plan.babyGender);
  const budgetTier = mapBudgetToDb(plan.budget ?? null);
  const colorPalette = normalizeText(plan.colorPalette);
  const materialFocus = normalizeText(plan.materialFocus);
  const ecoPriority = plan.ecoPriority === undefined ? false : plan.ecoPriority;
  const location = normalizeText(plan.location);

  const babyNickname = normalizeText(baby.nickname);
  const babyName = normalizeText(baby.name);
  const parentOneName = normalizeText(baby.parentOneName);
  const parentTwoName = normalizeText(baby.parentTwoName);
  const hospital = normalizeText(baby.hospital);
  const provider = normalizeText(baby.provider);
  const householdSetup = normalizeText(baby.householdSetup);
  const careNetwork = normalizeText(baby.careNetwork);
  const medicalNotes = normalizeText(baby.medicalNotes);
  const birthDate = normalizeDate(baby.birthDate);

  try {
    await sql`
      INSERT INTO users (clerk_id, updated_at)
      VALUES (${userId}, NOW())
      ON CONFLICT (clerk_id)
      DO UPDATE SET updated_at = NOW()
    `;
  } catch (error) {
    rethrowIfProfileTablesMissing(error);
  }

  try {
    await sql`
      INSERT INTO user_profiles (
        user_id,
        due_date,
        baby_gender,
        budget_tier,
        color_palette,
        material_focus,
        eco_priority,
        location,
        baby_name,
        baby_nickname,
        hospital,
        provider,
        household_setup,
        care_network,
        medical_notes,
        birth_date,
        parent_one_name,
        parent_two_name,
        updated_at
      ) VALUES (
        ${userId},
        ${dueDate},
        ${babyGender},
        ${budgetTier},
        ${colorPalette},
        ${materialFocus},
        ${ecoPriority},
        ${location},
        ${babyName},
        ${babyNickname},
        ${hospital},
        ${provider},
        ${householdSetup},
        ${careNetwork},
        ${medicalNotes},
        ${birthDate},
        ${parentOneName},
        ${parentTwoName},
        NOW()
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        due_date = EXCLUDED.due_date,
        baby_gender = EXCLUDED.baby_gender,
        budget_tier = EXCLUDED.budget_tier,
        color_palette = EXCLUDED.color_palette,
        material_focus = EXCLUDED.material_focus,
        eco_priority = EXCLUDED.eco_priority,
        location = EXCLUDED.location,
        baby_name = EXCLUDED.baby_name,
        baby_nickname = EXCLUDED.baby_nickname,
        hospital = EXCLUDED.hospital,
        provider = EXCLUDED.provider,
        household_setup = EXCLUDED.household_setup,
        care_network = EXCLUDED.care_network,
        medical_notes = EXCLUDED.medical_notes,
        birth_date = EXCLUDED.birth_date,
        parent_one_name = EXCLUDED.parent_one_name,
        parent_two_name = EXCLUDED.parent_two_name,
        updated_at = NOW()
    `;
  } catch (error) {
    rethrowIfProfileTablesMissing(error);
  }

  try {
    await sql`DELETE FROM profile_overviews WHERE user_id = ${userId}`;
  } catch (error) {
    if (isMissingProfileOverviewsTable(error)) {
      return;
    }
    rethrowIfProfileTablesMissing(error);
  }
}

async function fetchProfileRow(userId: string): Promise<ProfileRow | null> {
  try {
    const result = await sql<ProfileRow>`
      SELECT
        user_id,
        due_date,
        baby_gender,
        budget_tier,
        color_palette,
        material_focus,
        eco_priority,
        location,
        baby_name,
        baby_nickname,
        hospital,
        provider,
        household_setup,
        care_network,
        medical_notes,
        birth_date,
        parent_one_name,
        parent_two_name,
        created_at,
        updated_at
      FROM user_profiles
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    return result.rows[0] ?? null;
  } catch (error) {
    rethrowIfProfileTablesMissing(error);
  }
}

async function fetchLegacyProfile(userId: string): Promise<LegacyProfileRow | null> {
  try {
    const result = await sql<LegacyProfileRow>`
      SELECT plan, baby, created_at, updated_at
      FROM profile_overviews
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    return result.rows[0] ?? null;
  } catch (error) {
    if (isMissingProfileOverviewsTable(error)) {
      return null;
    }
    throw error;
  }
}

function buildProfileResponse(row: ProfileRow) {
  const plan: Record<string, unknown> = {};
  const baby: Record<string, unknown> = {};

  const dueDate = toIsoDateString(row.due_date);
  if (dueDate) {
    plan.dueDate = dueDate;
  }

  if (row.baby_gender) {
    plan.babyGender = row.baby_gender;
  }

  const budget = mapBudgetFromDb(row.budget_tier);
  if (budget) {
    plan.budget = budget;
  }

  if (row.color_palette) {
    plan.colorPalette = row.color_palette;
  }

  if (row.material_focus) {
    plan.materialFocus = row.material_focus;
  }

  if (row.eco_priority !== null && row.eco_priority !== undefined) {
    plan.ecoPriority = row.eco_priority;
  }

  if (row.location) {
    plan.location = row.location;
  }

  if (row.baby_name) {
    baby.name = row.baby_name;
  }

  if (row.baby_nickname) {
    baby.nickname = row.baby_nickname;
  }

  if (row.hospital) {
    baby.hospital = row.hospital;
  }

  if (row.provider) {
    baby.provider = row.provider;
  }

  if (row.household_setup) {
    baby.householdSetup = row.household_setup;
  }

  if (row.care_network) {
    baby.careNetwork = row.care_network;
  }

  if (row.medical_notes) {
    baby.medicalNotes = row.medical_notes;
  }

  const birthDate = toIsoDateString(row.birth_date);
  if (birthDate) {
    baby.birthDate = birthDate;
  }

  if (row.parent_one_name) {
    baby.parentOneName = row.parent_one_name;
  }

  if (row.parent_two_name) {
    baby.parentTwoName = row.parent_two_name;
  }

  return {
    user_id: row.user_id,
    plan,
    baby,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = profileSchema.parse(body);
  try {
    await upsertUserProfile(userId, parsed.plan ?? {}, parsed.baby ?? {});
  } catch (error) {
    if (error instanceof ProfileTablesNotReadyError) {
      return NextResponse.json(
        {
          error: "Profile storage not ready",
          details: error.message,
        },
        { status: 503 },
      );
    }

    console.error("Profile upsert error:", error);
    return NextResponse.json(
      {
        error: "Failed to save profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ status: "saved" });
}

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profileRow = await fetchProfileRow(userId);
    if (profileRow) {
      return NextResponse.json({ data: buildProfileResponse(profileRow) });
    }

    const legacyProfile = await fetchLegacyProfile(userId);
    if (legacyProfile) {
      const legacyPlan = (legacyProfile.plan ?? {}) as PlanInput;
      const legacyBaby = (legacyProfile.baby ?? {}) as BabyInput;

      await upsertUserProfile(userId, legacyPlan, legacyBaby);

      const migratedRow = await fetchProfileRow(userId);
      if (migratedRow) {
        return NextResponse.json({ data: buildProfileResponse(migratedRow) });
      }

      return NextResponse.json({
        data: {
          user_id: userId,
          plan: legacyPlan,
          baby: legacyBaby,
          created_at: legacyProfile.created_at,
          updated_at: legacyProfile.updated_at,
        },
      });
    }

    return NextResponse.json({ data: null });
  } catch (error) {
    if (error instanceof ProfileTablesNotReadyError) {
      return NextResponse.json(
        {
          error: "Profile storage not ready",
          details: error.message,
        },
        { status: 503 },
      );
    }

    console.error("Profile fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch profile",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
