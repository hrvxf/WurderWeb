import { test, expect } from "@playwright/test";

test("join route handles valid and invalid codes", async ({ page }) => {
  await page.goto("/join/ABC123");
  await expect(page.getByText("Opening the Wurder app...")).toBeVisible();

  await page.goto("/join/abc");
  await expect(page.getByText("Invalid game code")).toBeVisible();
});

test("manual join entry resolves code from URL payload", async ({ page }) => {
  await page.goto("/join?code=https://wurder.app/join/abc123");
  await expect(page.getByText("Resolved game code: ABC123")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled();
});

test("support contact is reachable", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByText("hello@wurder.app")).toBeVisible();
});
