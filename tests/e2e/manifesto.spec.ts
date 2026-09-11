import { expect, test } from "@playwright/test";

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
      page.getByText("To everyone building a life away from home,"),
    ).toBeInViewport();
    await expect(page.getByText(/We both grew up in Kerala/)).toHaveAttribute(
      "data-reveal",
      "shown",
    );
    const cta = page.getByRole("link", { name: "Book a conversation" });
    await cta.scrollIntoViewIfNeeded();
    await expect(cta).toBeInViewport();
    await expect(page.getByText("Aswin & Vinayak")).toHaveCount(1);
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
  const paragraph = page.getByText(/We both grew up in Kerala/);
  await paragraph.scrollIntoViewIfNeeded();
  await expect(paragraph).toHaveCSS("opacity", "1");
  await expect(paragraph).toBeInViewport();
  await context.close();
});
