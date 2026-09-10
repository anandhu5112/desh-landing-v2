import { expect, test } from "@playwright/test";

test("visitor reaches the embedded calendar from the primary CTA", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("main").getByRole("button", { name: "Let’s talk money" }).first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "A familiar face. A clearer next step." })).toBeVisible();
  // Cal is mounted with the invitation, not when the visitor asks for it, so
  // the calendar has loaded by the time they cross over to it.
  await expect(
    page.frameLocator('iframe[name="cal-embed=desh-modal-booking"]').getByRole("button", {
      name: "View next month",
    }),
  ).toBeVisible();
  const invitationFrame = (await dialog.boundingBox())!;
  await dialog.getByRole("button", { name: "Choose a time" }).click();

  await expect(page).toHaveURL("/");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("heading", { name: "Let’s find a time to connect." })).toBeVisible();
  await expect(
    page.frameLocator('iframe[name="cal-embed=desh-modal-booking"]').getByRole("button", {
      name: "View next month",
    }),
  ).toBeVisible();
  // Same card, not a second one: the frame doesn't move or resize underneath
  // the crossfade, and the invitation is still there beneath the calendar —
  // held out of reach rather than unmounted.
  expect(await dialog.boundingBox()).toEqual(invitationFrame);
  // Queried by class, not by role: the layer underneath is inert and
  // aria-hidden, so it is deliberately absent from the accessibility tree.
  const invitationLayer = dialog.locator("[inert]");
  await expect(invitationLayer).toHaveCount(1);
  await expect(invitationLayer).toContainText("Co-founder, Desh · Finance educator");
  await expect(invitationLayer).toContainText("Choose a time");
  await dialog.getByRole("button", { name: "Back", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "A familiar face. A clearer next step." })).toBeVisible();
  await dialog.getByRole("button", { name: "Choose a time" }).click();
  await expect(dialog.locator("iframe")).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("main").getByRole("button", { name: "Let’s talk money" }).first().click();
  await expect(dialog.getByRole("button", { name: "Choose a time" })).toBeVisible();
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
  await expect(dialog.getByRole("heading", { name: "A familiar face. A clearer next step." })).toBeVisible();
  await expect(dialog.getByText("30 minutes")).toBeVisible();
  await expect(dialog.getByText("Video call")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Choose a time" })).toBeInViewport();
  await dialog.getByRole("button", { name: "Choose a time" }).click();
  await expect(page).toHaveURL("/");
  await expect(dialog.getByRole("heading", { name: "Let’s find a time to connect." })).toBeVisible();
  await expect(dialog.locator("iframe")).toBeVisible();
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await dialog.locator("iframe").scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeInViewport();
});

test("booking invitation keeps keyboard focus inside and restores its trigger", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const trigger = page.getByRole("main").getByRole("button", { name: "Let’s talk money" }).first();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeFocused();
  await expect(dialog).toHaveAccessibleDescription(/You know Aswin from @aswinonfinance/);
  const social = dialog.getByRole("link", { name: /@aswinonfinance/ });
  await expect(social).toHaveAttribute("href", "https://www.instagram.com/aswinonfinance/");
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Choose a time" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(social).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

for (const viewport of [{ width: 320, height: 568 }, { width: 768, height: 600 }]) {
  test(`booking controls remain reachable at ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("main").getByRole("button", { name: "Let’s talk money" }).first().click();
    const dialog = page.getByRole("dialog");
    const bookingLink = dialog.getByRole("button", { name: "Choose a time" });
    await bookingLink.scrollIntoViewIfNeeded();
    await expect(bookingLink).toBeInViewport();
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  });
}
