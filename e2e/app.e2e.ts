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
    await expect.poll(() => page.locator("dialog a").count()).toBeGreaterThan(4);
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
  expect(await page.evaluate(() => (window as unknown as Win).cls)).toBe(0);
});

test("the picker switches knots without a reload, and history works", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/knots/overhand/");
  await page.evaluate(() => ((window as unknown as Win).marker = 1));
  await page.getByRole("button", { name: "All knots" }).click();
  await page.getByRole("link", { name: /Bowline/ }).click();
  await expect(page).toHaveURL(/\/knots\/bowline\/$/);
  await expect(page.getByRole("heading", { name: "Bowline" })).toBeVisible();
  await expect(page).toHaveTitle(/Bowline/);
  expect(await page.evaluate(() => (window as unknown as Win).marker)).toBe(1);

  await page.goBack();
  await expect(page.getByRole("heading", { name: "Overhand knot" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("reset view returns the camera after a drag", async ({ page }) => {
  await page.goto("/knots/overhand/");
  const reset = page.getByRole("button", { name: "Reset view" });
  await expect(reset).toBeDisabled();
  const box = (await page.locator("canvas").boundingBox())!;
  await page.mouse.move(box.width / 2, box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.width / 2 + 160, box.height / 2 - 60, { steps: 4 });
  await page.mouse.up();
  await expect(reset).toBeEnabled();
  await reset.click();
  await expect(reset).toBeDisabled();
});

test("old ?knot= links redirect and unknown pages are a 404", async ({ page }) => {
  await page.goto("/?knot=zeppelin");
  await expect(page).toHaveURL(/\/knots\/zeppelin\/$/);
  const response = await page.goto("/knots/no-such-knot/");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /isn’t here/ })).toBeVisible();
});

test("the stargazer search suggests logins as you type and goes to the one picked", async ({
  page,
}) => {
  const errors = collectErrors(page);
  // A fixed feed, so the test doesn't depend on who has starred the repo.
  const t0 = Date.parse("2026-01-01") / 1000;
  const s = [
    ["octocat", 583231, 0],
    ["behnamazimi", 1000001, 3600],
    ["knot-tyer", 1000002, 7200],
    ["azimuth-fan", 1000003, 60],
  ];
  await page.route("**/stargazers.json", (route) => route.fulfill({ json: { v: 1, t0, s } }));
  await page.route("https://avatars.githubusercontent.com/**", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.goto("/stargazers/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("4 knots");

  const search = page.getByRole("combobox", { name: /Find your knot/ });
  await search.fill("azim");
  await expect(search).toHaveAttribute("aria-expanded", "true");
  // A login that starts with it first, then one with it in the middle.
  await expect(page.getByRole("option")).toHaveText([/@azimuth-fan\s*#4/, /@behnamazimi\s*#2/]);
  await page.getByRole("option", { name: /behnamazimi/ }).click();
  await expect(search).toHaveAttribute("aria-expanded", "false");
  await expect(search).toHaveValue("behnamazimi");
  await expect(page.locator("section")).toContainText("#2@behnamazimi");

  // Keyboard only: letters in order find "knot-tyer"; Enter picks the highlighted one.
  await search.fill("@TYR");
  await search.press("ArrowDown");
  await expect(search).toHaveAttribute("aria-activedescendant", /.+/);
  await search.press("Enter");
  await expect(page.locator("section")).toContainText("#3@knot-tyer");

  await search.fill("nobody-here");
  await expect(search).toHaveAttribute("aria-expanded", "false");
  await search.press("Enter");
  await expect(page.getByText("Not on the rope yet")).toBeVisible();
  expect(errors).toEqual([]);
});
