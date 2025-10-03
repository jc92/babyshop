import { test, expect } from "@playwright/test";

const signInHeading = "Monthly essentials, made simple";
const disabledButtonCopy = "Sign-in unavailable in this build";

test.describe("Authenticated routes", () => {
  test("curated route falls back to sign-in prompt", async ({ page }) => {
    await page.goto("/curated");

    await expect(page.getByRole("heading", { name: signInHeading })).toBeVisible();
    await expect(page.getByRole("button", { name: disabledButtonCopy })).toBeVisible();
  });

  test("profile route falls back to sign-in prompt", async ({ page }) => {
    await page.goto("/profile");

    await expect(page.getByRole("heading", { name: signInHeading })).toBeVisible();
    await expect(page.getByRole("button", { name: disabledButtonCopy })).toBeVisible();
  });
});
