import { test, expect } from "@playwright/test";

test("join route handles valid and invalid codes", async ({ page }) => {
  await page.goto("/join/ABC123");
  await expect(page.getByText("Opening the Wurder app...")).toBeVisible();

  await page.goto("/join/abc");
  await expect(page.getByText("Invalid game code")).toBeVisible();
});

test("join page shows generate CTA by default", async ({ page }) => {
  await page.goto("/join");
  await expect(page.getByRole("button", { name: "Generate Join Code" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open in Wurder" })).toBeDisabled();
});

test("join page accepts code payload and renders QR actions", async ({ page }) => {
  await page.goto("/join?code=https://wurder.app/join/abc123");
  await expect(page.getByText("Your join code")).toBeVisible();
  await expect(page.getByText("ABC123")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open in Wurder" })).toBeEnabled();
  await expect(page.getByRole("link", { name: "Download Wurder" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Enter code manually" })).toBeVisible();
});

test("confirmation join QR flow excludes purchase metadata", async ({ page }) => {
  await page.goto("/confirmation?code=ABC123&players=12&addons=Guilds");
  await expect(page.getByText("Share Join QR")).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy Link" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Close" })).toBeVisible();
  await expect(page.getByText("Players:")).toHaveCount(0);
  await expect(page.getByText("Add-ons:")).toHaveCount(0);
  await expect(page.getByText("Checkout")).toHaveCount(0);
});

test("support contact is reachable", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.getByText("hello@wurder.app")).toBeVisible();
});
