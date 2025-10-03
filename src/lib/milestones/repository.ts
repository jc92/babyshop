import { sql } from "@vercel/postgres";
import {
  milestoneSeedData,
  type Milestone,
  type MilestoneId,
} from "@/data/catalog";

type MilestoneRow = {
  id: string;
  label: string;
  description: string;
  month_start: number;
  month_end: number;
  sort_order: number | null;
  summary: string | null;
  baby_focus: string[] | null;
  caregiver_focus: string[] | null;
  environment_focus: string[] | null;
  health_checklist: string[] | null;
  planning_tips: string[] | null;
};

function toMilestone(row: MilestoneRow): Milestone {
  return {
    id: row.id as MilestoneId,
    label: row.label,
    description: row.description,
    monthRange: [Number(row.month_start), Number(row.month_end)],
    summary: row.summary ?? undefined,
    babyFocus: row.baby_focus ?? undefined,
    caregiverFocus: row.caregiver_focus ?? undefined,
    environmentFocus: row.environment_focus ?? undefined,
    healthChecklist: row.health_checklist ?? undefined,
    planningTips: row.planning_tips ?? undefined,
  };
}

async function ensureTableExists() {
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
}

function toTextArrayLiteral(values?: string[] | null): string {
  if (!values || values.length === 0) {
    return "{}";
  }
  const escaped = values.map((value) =>
    `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
  );
  return `{${escaped.join(',')}}`;
}

async function seedDefaultMilestones() {
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
}

export async function getMilestones(): Promise<Milestone[]> {
  await ensureTableExists();
  await seedDefaultMilestones();

  const result = await sql<MilestoneRow>`
    SELECT
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
      planning_tips
    FROM milestones
    ORDER BY sort_order ASC, month_start ASC
  `;

  return result.rows.map(toMilestone);
}
