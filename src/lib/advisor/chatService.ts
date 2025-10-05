import { AdvisorChatRepository } from "@/lib/advisor/chatRepository";
import { advisorChatStateSchema, type AdvisorChatState } from "@/schemas/advisorChat";

function buildDefaultState(): AdvisorChatState {
  return advisorChatStateSchema.parse({});
}

export class AdvisorChatService {
  static async getState(userId: string | null | undefined): Promise<AdvisorChatState> {
    if (!userId) {
      return buildDefaultState();
    }

    const existing = await AdvisorChatRepository.getState(userId);
    if (existing) {
      return existing;
    }

    return buildDefaultState();
  }

  static async saveState(userId: string | null | undefined, state: AdvisorChatState): Promise<AdvisorChatState> {
    if (!userId) {
      return buildDefaultState();
    }

    return AdvisorChatRepository.upsertState(userId, state);
  }

  static async clearState(userId: string | null | undefined): Promise<void> {
    if (!userId) {
      return;
    }

    await AdvisorChatRepository.removeState(userId);
  }
}
