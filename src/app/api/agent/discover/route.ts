import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { ProductDiscoveryAgent } from '@/lib/agents/productDiscoveryAgent';
import { isAdminUser } from "@/lib/auth/admin";

const preferencesSchema = z.object({
  budgetTier: z.enum(['budget', 'standard', 'premium', 'luxury']).optional(),
  ecoPriority: z.boolean().optional(),
  style: z.string().max(120).optional(),
  milestoneId: z.string().optional(),
  mustInclude: z.array(z.string()).optional(),
  avoidKeywords: z.array(z.string()).optional(),
});

const requestSchema = z.object({
  query: z.string().min(3, 'Query must be at least 3 characters long'),
  limit: z.number().int().min(1).max(10).optional(),
  preferences: preferencesSchema.optional(),
});

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isAdminUser(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const payload = requestSchema.parse(await request.json());
    const result = await ProductDiscoveryAgent.discover(payload);

    return NextResponse.json({
      ...result,
      requestedBy: userId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request payload', issues: error.issues },
        { status: 400 },
      );
    }

    console.error('Product discovery agent error:', error);
    return NextResponse.json(
      {
        error: 'Failed to discover products',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
