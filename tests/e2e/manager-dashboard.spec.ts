import { expect, test } from "@playwright/test";

import { managerDashboardApiFixture } from "./fixtures/manager-dashboard.fixture";

const GAME_CODE = "4X6JWH";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("__E2E_BYPASS_MANAGER_AUTH__", "1");
  });

  await page.route("**/api/manager/games/*/dashboard", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(managerDashboardApiFixture),
    });
  });
});

test("renders manager dashboard table view with player drill-down", async ({ page }) => {
  await page.goto(`/manager/${GAME_CODE}?view=table`);

  await expect(page.getByRole("heading", { name: /Manager Dashboard/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Player Performance" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Player Table View" })).toBeVisible();

  await expect(page.getByRole("cell", { name: "Alice" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Bob" })).toBeVisible();

  await page.getByPlaceholder("Search player").fill("Alice");
  await expect(page.getByRole("cell", { name: "Alice" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Bob" })).toHaveCount(0);

  await page.getByRole("row", { name: /Alice/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Player ID: player-1")).toBeVisible();
  await expect(page.getByText("Deaths Basis")).toBeVisible();

  await page.getByRole("button", { name: "Close" }).first().click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("switches to charts view and preserves view query", async ({ page }) => {
  await page.goto(`/manager/${GAME_CODE}`);

  await page.getByRole("button", { name: "Visual Analytics View" }).click();

  await expect(page).toHaveURL(new RegExp(`/manager/${GAME_CODE}\\?view=charts$`));
  await expect(page.getByRole("heading", { name: "Visual Analytics" })).toBeVisible();
  await expect(page.getByText(/Player Scatter Dataset/i)).toBeVisible();
});
