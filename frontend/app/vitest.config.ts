import { resolve } from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_BACKEND_URL": JSON.stringify("http://localhost:5109"),
    "import.meta.env.VITE_APP_URL": JSON.stringify("http://localhost:5173"),
    "import.meta.env.VITE_WEBSITE_URL": JSON.stringify("http://localhost:3001"),
  },
  resolve: {
    // Use array form to ensure specific aliases take priority over the generic @/ alias
    alias: [
      // @/components/ui and @/components/shared now live in the shared package
      {
        find: /^@\/components\/ui(\/.+)?$/,
        replacement: resolve(__dirname, "../shared/components/ui$1"),
      },
      {
        find: /^@\/components\/shared(\/.+)?$/,
        replacement: resolve(__dirname, "../shared/components/shared$1"),
      },
      { find: "@flowconsole/ui", replacement: resolve(__dirname, "../shared") },
      {
        find: "@flowconsole/web",
        replacement: resolve(__dirname, "../../src/web/index.ts"),
      },
      { find: "@", replacement: resolve(__dirname, ".") },
    ],
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environmentMatchGlobs: [["tests/**/*.test.tsx", "jsdom"]],
  },
});
