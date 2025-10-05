import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { AdvisorChatService } from "@/lib/advisor/chatService";
import { advisorChatStateSchema } from "@/schemas/advisorChat";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = await AdvisorChatService.getState(userId);
  return NextResponse.json({ data: state });
}

export async function PUT(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsed;
  try {
    const json = await request.json();
    parsed = advisorChatStateSchema.parse(json);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid advisor chat state payload",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }

  const saved = await AdvisorChatService.saveState(userId, parsed);
  return NextResponse.json({ data: saved });
}
