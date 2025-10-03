import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("shows hero copy and navigation links", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "AI-crafted baby registry, tailored for every milestone" }),
    ).toBeVisible();

    await expect(page.getByRole("link", { name: "Start building my registry" })).toBeVisible();
    await expect(page.getByRole("link", { name: "See how it works" })).toBeVisible();

    const sectionCards = page.getByRole("article").filter({ hasText: "Explore" });
    await expect(sectionCards).toHaveCount(3);
  });
});
