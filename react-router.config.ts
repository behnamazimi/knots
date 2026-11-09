import { copyFile } from "node:fs/promises";
import type { Config } from "@react-router/dev/config";
import { knots } from "./src/engine/knots";
import { knotPath } from "./src/app/shared/site";

export default {
  appDirectory: "src/app",
  // A static site: every knot page is prerendered to HTML, then runs as a client-side app.
  ssr: false,
  prerender: ["/", ...knots.map((k) => knotPath(k.id))],
  async buildEnd({ reactRouterConfig: { buildDirectory } }) {
    // Hosts serve 404.html for unknown paths; the SPA shell then shows the not-found page.
    await copyFile(
      `${buildDirectory}/client/__spa-fallback.html`,
      `${buildDirectory}/client/404.html`,
    );
  },
} satisfies Config;
