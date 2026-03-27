import { expect, test } from "@playwright/test";

test("keyboard Enter on Business start session sends logged-out user to login with next path", async ({ page }) => {
  await page.goto("/business", { waitUntil: "domcontentloaded" });

  const startSessionLink = page.getByRole("link", { name: "Start session" }).first();
  await startSessionLink.focus();
  await startSessionLink.press("Enter");

  await expect
    .poll(async () => page.url(), { timeout: 10000 })
    .toContain("/business/sessions/new");
});

test("keyboard Enter on Join primary action sends logged-out user to login", async ({ page }) => {
  await page.goto("/join", { waitUntil: "domcontentloaded" });

  const openSignInLink = page.getByRole("link", { name: "Open sign in" });
  await openSignInLink.focus();
  await openSignInLink.press("Enter");

  await expect
    .poll(async () => page.url(), { timeout: 10000 })
    .toContain("/login?next=%2Fjoin");
});

test("keyboard Enter on Download back-to-join link preserves game code route", async ({ page }) => {
  await page.goto("/download?gameCode=ABC123", { waitUntil: "domcontentloaded" });

  const backToJoinLink = page.getByRole("link", { name: "Back to join" });
  await backToJoinLink.focus();
  await backToJoinLink.press("Enter");

  await expect
    .poll(async () => page.url(), { timeout: 10000 })
    .toContain("/join/ABC123");
});
