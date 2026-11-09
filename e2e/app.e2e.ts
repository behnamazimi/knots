import { expect, test, type Page } from "@playwright/test";

type Win = Window & { cls: number; marker?: number };

const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
};

test("a knot page bakes, plays, steps and scrubs", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/knots/overhand/");
  await expect(page.getByRole("heading", { name: "Overhand knot" })).toBeVisible();
  await expect(page.locator("[data-baked=true]")).toBeVisible({ timeout: 60_000 });

  // Reduced motion: the knot waits for the play button.
  const play = page.getByRole("button", { name: "Play" });
  await expect(play).toHaveAttribute("aria-pressed", "false");
  await play.click();
  await expect(page.getByRole("button", { name: "Pause" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: /^Step 4:/ }).click();
  await expect(page.getByLabel("Playback")).toContainText("Pull both ends to tighten");
  expect(errors).toEqual([]);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the prerendered page has the whole layout, the poster and share tags", async ({ page }) => {
    await page.goto("/knots/zeppelin/");
    await expect(page.getByRole("heading", { name: "Zeppelin bend" })).toBeVisible();
    await expect(page.getByLabel("Playback")).toContainText("1/7");
    await expect(page.getByRole("button", { name: /^Step 7:/ })).toBeAttached();
    await expect(page.locator('img[src="/og/zeppelin.jpg"]').first()).toBeVisible();
    // At least the first few knots; an exact count would break every time a knot is added.
    await expect(page.getByRole("heading", { name: "How to tie it" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Square knot" }).first()).toBeAttached();
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/og\/zeppelin\.jpg$/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/knots\/zeppelin\/$/,
    );
  });
});

test("loading does not shift the layout", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as Win).cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      })[])
        if (!e.hadRecentInput) (window as unknown as Win).cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/knots/bowline/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(1500);
  // Not exactly 0: the web font swapping in can nudge a line of text by a hair.
  expect(await page.evaluate(() => (window as unknown as Win).cls)).toBeLessThan(0.001);
});

test("related links switch knots without a reload, and history works", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/knots/overhand/");
  await page.evaluate(() => ((window as unknown as Win).marker = 1));
  await page.getByRole("link", { name: "Figure-eight knot" }).first().click();
  await page.getByRole("link", { name: "Bowline" }).first().click();
  await expect(page).toHaveURL(/\/knots\/bowline\/$/);
  await expect(page.getByRole("heading", { name: "Bowline" })).toBeVisible();
  await expect(page).toHaveTitle(/Bowline/);
  expect(await page.evaluate(() => (window as unknown as Win).marker)).toBe(1);

  await page.goBack();
  await expect(page.getByRole("heading", { name: "Figure-eight knot" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("reset view returns the camera after a drag", async ({ page }) => {
  await page.goto("/knots/overhand/");
  const reset = page.getByRole("button", { name: "Reset view" });
  await expect(reset).toBeDisabled();
  const box = (await page.locator("canvas").boundingBox())!;
  const [cx, cy] = [box.x + box.width / 2, box.y + box.height / 2];
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 160, cy - 60, { steps: 4 });
  await page.mouse.up();
  await expect(reset).toBeEnabled();
  await reset.click();
  await expect(reset).toBeDisabled();
});

test("the home page filters the cards by job", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Zeppelin bend/ })).toBeVisible();
  await page.getByRole("button", { name: "Tie to a post" }).click();
  await expect(page.getByRole("link", { name: /Clove hitch/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Zeppelin bend/ })).toBeHidden();
});

test("old ?knot= links redirect and unknown pages are a 404", async ({ page }) => {
  await page.goto("/?knot=zeppelin");
  await expect(page).toHaveURL(/\/knots\/zeppelin\/$/);
  const response = await page.goto("/knots/no-such-knot/");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /isn’t here/ })).toBeVisible();
});
