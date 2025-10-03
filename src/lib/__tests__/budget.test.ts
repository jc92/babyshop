import { describe, expect, test } from "vitest";
import { mapBudgetFromDb, mapBudgetToDb } from "@/lib/profile/budget";

describe("budget mappers", () => {
  test("mapBudgetToDb normalizes known tiers", () => {
    expect(mapBudgetToDb("Essentials")).toBe("budget");
    expect(mapBudgetToDb("balanced")).toBe("standard");
    expect(mapBudgetToDb("premium")).toBe("premium");
  });

  test("mapBudgetToDb passes through unknown inputs", () => {
    expect(mapBudgetToDb("luxury")).toBe("luxury");
    expect(mapBudgetToDb(null)).toBeNull();
  });

  test("mapBudgetFromDb elevates legacy values", () => {
    expect(mapBudgetFromDb("budget")).toBe("essentials");
    expect(mapBudgetFromDb("standard")).toBe("balanced");
    expect(mapBudgetFromDb("premium")).toBe("premium");
    expect(mapBudgetFromDb("luxury")).toBe("premium");
  });

  test("mapBudgetFromDb returns null for unknown values", () => {
    expect(mapBudgetFromDb("surprise")).toBeNull();
  });
});
