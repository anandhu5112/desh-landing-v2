import { expect, test } from "@playwright/test";

test("visitor reaches the embedded calendar from the primary CTA", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("main").getByRole("button", { name: "Let’s talk money" }).first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Let’s talk about your next move." })).toBeVisible();
  await dialog.getByRole("link", { name: "Choose a time" }).click();

  await expect(page).toHaveURL(/\/book$/);
  await expect(page.getByRole("heading", { name: "Choose a time that works for you." })).toBeVisible();
  await expect(
    page.frameLocator('iframe[name="cal-embed=desh-booking"]').getByRole("heading", {
      name: "A conversation about your money",
    }),
  ).toBeVisible();
});

test("mobile visitor opens the same focused booking flow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .getByRole("navigation", { name: "Mobile" })
    .getByRole("button", { name: "Let’s talk money" })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Let’s talk about your next move." })).toBeVisible();
  await expect(dialog.getByText("30 minutes")).toBeVisible();
  await expect(dialog.getByText("Video call")).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Choose a time" })).toHaveAttribute("href", "/book");
});
