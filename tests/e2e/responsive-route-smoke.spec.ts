import { expect, test } from "@playwright/test";

const publicRoutes = ["/join", "/join/ABC123", "/download?gameCode=ABC123", "/business"];
const memberRoutes = ["/members", "/members/profile", "/members/stats", "/members/host", "/members/settings"];

test("desktop route smoke keeps key entry points reachable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  for (const route of publicRoutes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
  }

  for (const route of memberRoutes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect
      .poll(async () => page.url(), { timeout: 10000 })
      .toContain("/login?next=%2Fmembers");
  }
});

test("mobile route smoke keeps key entry points reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/join", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Join in app or start a personal session" })).toBeVisible();

  await page.goto("/business", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Build stronger teams through live communication challenges." })).toBeVisible();

  await page.goto("/download?gameCode=ABC123", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Download Wurder" })).toBeVisible();
  await expect(page.getByText("ABC123")).toBeVisible();
});
