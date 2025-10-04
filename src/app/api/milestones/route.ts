import { NextResponse } from "next/server";
import { getMilestones, MilestonesTableMissingError } from "@/lib/milestones/repository";

export async function GET() {
  try {
    const milestones = await getMilestones();
    return NextResponse.json({ data: milestones });
  } catch (error) {
    if (error instanceof MilestonesTableMissingError) {
      return NextResponse.json(
        {
          error: "Milestones are not seeded",
          details: error.message,
        },
        { status: 503 },
      );
    }

    console.error("Milestones fetch error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch milestones",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
