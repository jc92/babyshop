import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sqlMock = vi.hoisted(() => vi.fn());

vi.mock("@vercel/postgres", () => ({
  sql: sqlMock,
}));

const { getMilestones, MilestonesTableMissingError } = await import("@/lib/milestones/repository");

describe("Milestones repository", () => {
  beforeEach(() => {
    sqlMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps milestone rows to domain objects", async () => {
    sqlMock.mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          id: "prenatal",
          label: "Prenatal",
          description: "Before baby arrives",
          month_start: 0,
          month_end: 1,
          sort_order: 1,
          summary: "Summary",
          baby_focus: ["Bonding"],
          caregiver_focus: null,
          environment_focus: null,
          health_checklist: ["Doctor visit"],
          planning_tips: null,
        },
      ],
    });

    const milestones = await getMilestones();

    expect(milestones).toHaveLength(1);
    expect(milestones[0].monthRange).toEqual([0, 1]);
    expect(milestones[0].babyFocus).toEqual(["Bonding"]);
  });

  it("returns seed data when the table is empty", async () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    sqlMock.mockResolvedValue({ rowCount: 0, rows: [] });

    const milestones = await getMilestones();

    expect(milestones.length).toBeGreaterThan(0);
    expect(consoleSpy).toHaveBeenCalledWith("Milestones table is empty. Falling back to seed data.");

    consoleSpy.mockRestore();
  });

  it("throws a MilestonesTableMissingError when the table is missing", async () => {
    const missingTableError = new Error("relation \"milestones\" does not exist");
    sqlMock.mockRejectedValue(missingTableError);

    await expect(getMilestones()).rejects.toBeInstanceOf(MilestonesTableMissingError);
  });
});
