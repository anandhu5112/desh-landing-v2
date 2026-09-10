import { expect, test } from "@playwright/test";

test("hero initial matches the other decorative heading initials", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const initial = page.locator("h1 span").filter({ hasText: /^N$/ }).last();
  await expect(initial).toHaveText("N");
  const reference = page.locator('h2 span[class*="dropCap"]').first();
  const typography = (element: Element) => {
    const style = getComputedStyle(element);
    return { family: style.fontFamily, style: style.fontStyle, weight: style.fontWeight };
  };
  expect(await initial.evaluate(typography)).toEqual(await reference.evaluate(typography));
});
