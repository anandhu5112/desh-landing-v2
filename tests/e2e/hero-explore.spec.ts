import { expect, test } from "@playwright/test";

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`hero explores the sun and returns to the opening (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto("/");
    const hero = page.getByRole("main").first();
    const explore = hero.getByRole("button", { name: "Explore" });
    const primary = hero.getByRole("button", { name: "Let’s talk money" });
    await expect(explore).toBeVisible();
    await expect(hero.getByText("With roots in India", { exact: false })).toHaveCount(0);
    const left = (await explore.boundingBox())!;
    const right = (await primary.boundingBox())!;
    expect(right.x).toBeGreaterThan(left.x + left.width);
    await explore.click();
    const sunHeading = hero.locator('h2[tabindex="-1"]');
    await expect(sunHeading).toBeFocused();
    await expect(sunHeading).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.screenshot({ path: `output/hero-sun-${reducedMotion}.png` });
    // Real input after arrival remains connected to the same scroll sequence.
    await page.mouse.move(600, 600);
    await page.mouse.wheel(0, -5000);
    await expect.poll(() => page.locator("#page-scroller").evaluate(el => el.scrollTop)).toBeLessThan(5);
    await expect(explore).toBeVisible();
    await primary.click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
}

for (const width of [320, 390, 1440]) {
  test(`hero actions fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const hero = page.getByRole("main").first();
    for (const button of await hero.getByRole("button").all()) {
      await expect(button).toBeInViewport();
      const box = (await button.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    const heading = (await hero.getByRole("heading", { level: 1 }).boundingBox())!;
    expect(heading.x).toBeGreaterThanOrEqual(0);
    expect(heading.x + heading.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `output/hero-opening-${width}.png` });
  });
}

test("manual input interrupts the cinematic shortcut", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore" }).click();
  await expect.poll(() => page.locator("#page-scroller").evaluate(el => el.scrollTop)).toBeGreaterThan(20);
  await page.mouse.wheel(0, -5000);
  await expect.poll(() => page.locator("#page-scroller").evaluate(el => el.scrollTop)).toBeLessThan(5);
  await page.waitForTimeout(2000);
  expect(await page.locator("#page-scroller").evaluate(el => el.scrollTop)).toBeLessThan(5);
});

for (const width of [390, 1440]) {
  test(`dawn anticipates the sunrise and reverses at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const hero = page.getByRole("main").first();
    const glow = hero.locator('[class*="dawnGlow"]');
    const shade = hero.locator('[class*="dawnShade"]');
    const warmth = hero.locator('[class*="dawnWarmth"]');
    const opacity = (locator: typeof glow) => locator.evaluate(el => Number(getComputedStyle(el).opacity));
    await expect(glow).toHaveCSS("opacity", "0");
    // During anticipation the glow is present, but the land has not warmed.
    await page.mouse.move(width / 2, 450);
    await page.mouse.wheel(0, 420);
    await expect.poll(() => opacity(glow)).toBeGreaterThan(0.4);
    await expect(warmth).toHaveCSS("opacity", "0");
    await expect(shade).toHaveCSS("opacity", "0.16");
    await page.screenshot({ path: `output/dawn-anticipation-${width}.png` });
    await page.mouse.wheel(0, 1100);
    await expect.poll(() => opacity(warmth)).toBeGreaterThan(0.17);
    await expect.poll(() => opacity(shade)).toBeLessThan(0.01);
    await expect(hero.locator('h2[tabindex="-1"]')).toBeVisible();
    await page.screenshot({ path: `output/dawn-reveal-${width}.png` });
    await page.mouse.wheel(0, -5000);
    await expect.poll(() => opacity(glow)).toBeLessThan(0.01);
    await expect(warmth).toHaveCSS("opacity", "0");
    await expect(shade).toHaveCSS("opacity", "0.16");
  });
}


test("Explore gives the sunrise time to unfold before revealing the statement", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const hero = page.getByRole("main").first();
  await hero.getByRole("button", { name: "Explore", exact: true }).click();
  const heading = hero.locator('h2[tabindex="-1"]');
  // The old 1.8-second shortcut had already finished at this point.
  await page.waitForTimeout(2200);
  await expect(hero.locator('[class*="heroOutro"][aria-hidden]')).toHaveAttribute("aria-hidden", "true");
  const warmth = await hero.locator('[class*="dawnWarmth"]').evaluate(
    el => Number(getComputedStyle(el).opacity)
  );
  expect(warmth).toBeGreaterThan(0);
  expect(warmth).toBeLessThan(0.18);
  await expect(heading).toBeFocused();
  await expect(heading).toBeVisible();
});

test("Explore blooms the sun before settling into an afterglow", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const hero = page.getByRole("main").first();
  const glow = hero.locator("[data-sun-glow]");
  const opacity = () => glow.evaluate(el => Number(getComputedStyle(el).opacity));

  await expect(glow).toHaveCSS("opacity", "0");
  await hero.getByRole("button", { name: "Explore", exact: true }).click();
  await expect.poll(opacity).toBeGreaterThan(0.8);
  await expect.poll(opacity).toBeLessThanOrEqual(0.71);
});
