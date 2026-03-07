import { test, expect } from "@playwright/test";

test("join route handles valid and invalid codes", async ({ page }) => {
  await page.goto("/join/ABC123");
  await expect(page.getByText("Opening the Wurder app...")).toBeVisible();

  await page.goto("/join/abc");
  await expect(page.getByText("Invalid game code")).toBeVisible();
});

test("support contact is reachable", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByText("hello@wurder.app")).toBeVisible();
});
