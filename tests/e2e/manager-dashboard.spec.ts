import { expect, test } from "@playwright/test";

const GAME_CODE = "4X6JWH";

test("business session dashboard route renders auth-gated business workspace shell", async ({ page }) => {
  await page.goto(`/business/sessions/${GAME_CODE}`, { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(new RegExp(`/business/sessions/${GAME_CODE}$`));
  await expect(page.getByText("Business Workspace")).toBeVisible();
  await expect(page.getByText("Checking your member session...")).toBeVisible();
});

test("legacy manager route redirects to canonical business session route", async ({ request }) => {
  const response = await request.get(`/manager/${GAME_CODE}?view=table`, {
    maxRedirects: 0,
  });

  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe(`/business/sessions/${GAME_CODE}`);
});
