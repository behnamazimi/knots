import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

const appVersion = (process.env.APP_VERSION || "0.1.0").replace(/^v/, "");

// Vitest runs the engine and component tests without the React Router build plugin.
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [!process.env.VITEST && reactRouter()],
});
