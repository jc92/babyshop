import type { Milestone } from "@/data/catalog";

async function handleResponse(response: Response) {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = typeof error?.error === "string" ? error.error : response.statusText;
    throw new Error(message || "Failed to fetch milestones");
  }
  return response.json() as Promise<{ data?: Milestone[] } | Milestone[]>;
}

export class MilestoneService {
  private static baseUrl = "/api/milestones";

  static async list(): Promise<Milestone[]> {
    const response = await fetch(this.baseUrl, { method: "GET" });
    const payload = await handleResponse(response);

    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload?.data && Array.isArray(payload.data)) {
      return payload.data;
    }

    return [];
  }
}
