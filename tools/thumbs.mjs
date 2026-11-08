// Shoots each knot's finished state: public/og/<id>.jpg, 1200×630, used as the share preview
// (og:image) and the picker card. Needs the dev server: `pnpm dev`, then `pnpm thumbs` (or
// `pnpm thumbs http://localhost:5177`; `--knot=<id>` shoots one knot, `--headed` shows the browser). Run it again after adding a knot or changing how one ends.
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}`))?.split("=")[1] ?? false;
const base = args.find((a) => !a.startsWith("--")) ?? "http://localhost:5173";
const only = flag("knot"); // --knot=<id>: shoot just that knot
const headed = args.includes("--headed"); // watch the browser draw
const out = new URL("../public/og/", import.meta.url);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ headless: !headed });
// Baking runs in a small window, which headless Chromium draws quickly in software; the shot is
// taken in a big one (scene scale follows the window height), cropped 600×315 around the knot at
// 2× pixels: the 1200×630 Open Graph size. The renderer caps its pixel ratio at 2.
const SMALL = { width: 400, height: 300 };
const BIG = { width: 1200, height: 900 };
// Knots too long for that crop: crop this many times wider and taller at fewer pixels per point,
// so the picture is still 1200×630.
const WIDE = { "daisy-chain": 1.6 };
const index = await browser.newPage({ viewport: SMALL });
await index.goto(base);
// The picker's cards link to /knots/<id>/.
const ids = await index.$$eval("dialog a[href^='/knots/']", (links) =>
  links.map((a) => decodeURIComponent(new URL(a.href).pathname.split("/")[2])),
);

await index.close();

for (const id of ids.filter((id) => !only || id === only)) {
  const k = WIDE[id] ?? 1;
  const [W, H] = [600 * k, 315 * k];
  const big = { width: BIG.width * k, height: BIG.height }; // wider, same scale: it follows the height
  const page = await browser.newPage({ viewport: SMALL, deviceScaleFactor: 2 / k });
  await page.goto(`${base}/knots/${id}/`);
  await page.waitForSelector("[data-baked=true]", { timeout: 120_000 });
  // Jump to the end; playback stops there, so the finished knot stays put.
  await page.focus("input[aria-label=Timeline]");
  await page.keyboard.press("End");
  // The canvas sits inside the page's layout, so hide everything else and show the canvas again.
  await page.addStyleTag({
    content: "body * { visibility: hidden !important; } canvas { visibility: visible !important; }",
  });
  await page.setViewportSize(big);
  await page.waitForTimeout(2000);
  // Centre the crop on the knot: the column and the row with the most rope in them.
  const shot = (await page.screenshot({ timeout: 120_000 })).toString("base64");
  const [cx, cy, right] = await page.evaluate(
    async ([png, across]) => {
      const img = await createImageBitmap(
        await (await fetch(`data:image/png;base64,${png}`)).blob(),
      );
      const ctx = new OffscreenCanvas(img.width, img.height).getContext("2d");
      ctx.drawImage(img, 0, 0);
      const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
      const bg = [data[0], data[1], data[2]];
      const cols = new Float64Array(width);
      const rows = new Float64Array(height);
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const d =
            Math.abs(data[i] - bg[0]) +
            Math.abs(data[i + 1] - bg[1]) +
            Math.abs(data[i + 2] - bg[2]);
          if (d > 60) {
            cols[x]++;
            rows[y]++;
          }
        }
      // Smooth over about a knot's width so one thick strand does not win.
      const peak = (a, r) => {
        let best = 0,
          at = 0;
        for (let i = 0; i < a.length; i++) {
          let s = 0;
          for (let j = Math.max(0, i - r); j < Math.min(a.length, i + r); j++) s += a[j];
          if (s > best) {
            best = s;
            at = i;
          }
        }
        return at;
      };
      const last = cols.findLastIndex((n) => n > 0);
      return [
        peak(cols, across) / devicePixelRatio,
        peak(rows, 160) / devicePixelRatio,
        last / devicePixelRatio,
      ];
    },
    [shot, k === 1 ? 160 : (0.4 * W * 2) / k],
  ); // a wide knot: the stretch of the crop's width with the most rope
  let x = Math.min(Math.max(cx - W / 2, 0), big.width - W);
  // A rope that ends in the picture (a loop, a tail) must not be cut off: slide right to fit it, but keep the knot in.
  // A wide knot stays centred instead: its long tail may run off the edge.
  if (right < big.width - 1 && k === 1)
    x = Math.min(Math.max(x, right + 20 - W), cx - 100, big.width - W);
  const y = Math.min(Math.max(cy - H / 2, 0), big.height - H);
  const path = new URL(`${id}.jpg`, out).pathname;
  await page.screenshot({
    path,
    type: "jpeg",
    quality: 80,
    clip: { x, y, width: W, height: H },
    timeout: 120_000,
  });
  console.log(path);
  await page.close();
}
await browser.close();
