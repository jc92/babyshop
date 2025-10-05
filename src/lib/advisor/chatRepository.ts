import { sql } from "@vercel/postgres";
import { advisorChatStateSchema, type AdvisorChatState } from "@/schemas/advisorChat";

function sanitizeState(state: unknown): AdvisorChatState {
  return advisorChatStateSchema.parse(state ?? {});
}

export class AdvisorChatRepository {
  static async getState(userId: string): Promise<AdvisorChatState | null> {
    const result = await sql`
      SELECT state
      FROM advisor_chat_states
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    if (!result.rows.length) {
      return null;
    }

    const [row] = result.rows;
    return sanitizeState(row.state);
  }

  static async upsertState(userId: string, state: AdvisorChatState): Promise<AdvisorChatState> {
    const normalized = sanitizeState(state);

    await sql`
      INSERT INTO advisor_chat_states (user_id, state, updated_at)
      VALUES (${userId}, ${JSON.stringify(normalized)}::jsonb, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()
    `;

    return normalized;
  }

  static async removeState(userId: string): Promise<void> {
    await sql`
      DELETE FROM advisor_chat_states
      WHERE user_id = ${userId}
    `;
  }
}
