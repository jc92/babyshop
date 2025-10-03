import type { BudgetTier } from "@/data/preferences";

const toDbMap: Record<BudgetTier, string> = {
  essentials: "budget",
  balanced: "standard",
  premium: "premium",
};

const fromDbMap: Record<string, BudgetTier> = {
  budget: "essentials",
  standard: "balanced",
  premium: "premium",
  luxury: "premium",
};

export function mapBudgetToDb(budget?: string | null): string | null {
  if (!budget) {
    return null;
  }

  const normalized = budget.toLowerCase();
  return toDbMap[normalized as BudgetTier] ?? normalized;
}

export function mapBudgetFromDb(value?: string | null): BudgetTier | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
  return fromDbMap[normalized] ?? null;
}
