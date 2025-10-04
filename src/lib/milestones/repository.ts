import { sql } from "@vercel/postgres";
import { type Milestone, type MilestoneId } from "@/data/catalog";
import { milestoneSeedData } from "@/data/defaultMilestones";

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

function isMissingMilestonesTable(error: unknown): boolean {
  return (
    error instanceof Error &&
    /relation "milestones" does not exist/i.test(error.message)
  );
}

export class MilestonesTableMissingError extends Error {
  constructor(message: string = "Milestones table is not available") {
    super(message);
    this.name = "MilestonesTableMissingError";
  }
}

export async function getMilestones(): Promise<Milestone[]> {
  try {
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

    if (result.rowCount === 0) {
      console.warn("Milestones table is empty. Falling back to seed data.");
      return milestoneSeedData.map((milestone) => {
        const { sortOrder, ...rest } = milestone;
        void sortOrder;
        return { ...rest };
      });
    }

    return result.rows.map(toMilestone);
  } catch (error) {
    if (isMissingMilestonesTable(error)) {
      throw new MilestonesTableMissingError(
        "Milestones table missing. Run the database setup to seed initial data.",
      );
    }
    throw error;
  }
}
