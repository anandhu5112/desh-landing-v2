import { expect, test } from "@playwright/test";

test("hero stays put with CSS sticky, not a GSAP transform pin", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const hero = page.getByRole("main").first();
  const frame = hero.locator("[data-nav-glass-frame]");

  await expect(hero).toHaveCSS("position", "sticky");
  expect(await page.locator(".pin-spacer").count()).toBe(0);
  // Liquid glass stays on — the pin change must not disable it.
  expect(await page.locator("[data-liquid-glass]").count()).toBeGreaterThan(0);

  const topAt = () => frame.evaluate((el) => Math.round(el.getBoundingClientRect().top));
  const startTop = await topAt();

  await page.mouse.move(195, 420);
  await page.mouse.wheel(0, 480);
  await expect.poll(topAt).toBe(startTop);

  // The old pinType:"fixed" candidate never released. Sticky must.
  // Wheel rather than assigning scrollTop: Lenis observes the scroller and
  // would lerp a raw assignment back to its last target, leaving the hero
  // still covering the viewport and a false "never unpins" reading.
  for (let i = 0; i < 24; i++) await page.mouse.wheel(0, 800);
  await expect.poll(() => hero.evaluate((el) => el.getBoundingClientRect().bottom)).toBeLessThan(0);
});
