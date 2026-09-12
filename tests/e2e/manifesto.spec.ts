import { expect, test } from "@playwright/test";

for (const width of [375, 641, 1440]) {
  test(`homepage navigation opens the manifesto at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    if (width <= 640) {
      await page.getByRole("button", { name: "Open menu" }).click();
    }
    const navigation = page.getByRole("navigation", {
      name: width <= 640 ? "Mobile" : "Primary",
      exact: true,
    });
    const manifesto = navigation.getByRole("link", { name: "Manifesto" });
    await expect(manifesto).toBeInViewport();
    const bounds = await navigation.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await manifesto.click();
    await expect(page).toHaveURL(/\/manifesto\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
  });
}

for (const width of [320, 375, 414, 768, 1440]) {
  test(`manifesto stays readable and navigable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/manifesto");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport();
    const landscape = page.locator('img[src*="manifesto-kerala"]').first();
    await expect
      .poll(() =>
        landscape.evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBeGreaterThan(0);
    await page.getByRole("link", { name: "Read our letter" }).click();
    await expect(
      page.getByText(/Hi Reader far from home,/),
    ).toBeInViewport();
    await expect(page.getByText(/You moved abroad. Your connection to India moved with you./)).toHaveAttribute(
      "data-reveal",
      "shown",
    );
    const cta = page.getByRole("link", { name: "Let's talk Money" });
    await cta.scrollIntoViewIfNeeded();
    await expect(cta).toBeInViewport();
    await expect(page.getByText("Aswin and Vinayak")).toHaveCount(1);
    expect(
      await page
        .locator("main")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await cta.click();
    await expect(page).toHaveURL(/\/book\/?$/);
  });
}

test("manifesto can be read without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/manifesto");
  const paragraph = page.getByText(/You moved abroad. Your connection to India moved with you./);
  await paragraph.scrollIntoViewIfNeeded();
  await expect(paragraph).toHaveCSS("opacity", "1");
  await expect(paragraph).toBeInViewport();
  await context.close();
});
