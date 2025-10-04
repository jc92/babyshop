import { cache } from "react";

const RAW_ADMIN_IDS = process.env.ADMIN_CLERK_IDS ?? "";

const normalizeIds = (raw: string): Set<string> => {
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
};

export const getAdminIdSet = cache(() => normalizeIds(RAW_ADMIN_IDS));

const ALLOW_DEV_FALLBACK =
  process.env.NODE_ENV !== "production" && getAdminIdSet().size === 0;

export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) {
    return false;
  }

  const adminIds = getAdminIdSet();
  if (adminIds.size === 0) {
    return ALLOW_DEV_FALLBACK;
  }

  return adminIds.has(userId);
}

export class AdminAccessError extends Error {
  constructor(message: string = "Administrator access required") {
    super(message);
    this.name = "AdminAccessError";
  }
}

export function assertAdminUser(
  userId: string | null | undefined,
  message?: string,
): asserts userId is string {
  if (!isAdminUser(userId)) {
    throw new AdminAccessError(message);
  }
}

