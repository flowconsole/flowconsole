import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

/**
 * Custom plugin that resolves unresolved imports from src/web
 * using the app's own node_modules directory.
 *
 * This is needed because src/web is referenced as a direct path
 * (not a proper workspace package with its own node_modules), so Rollup
 * cannot resolve its peer deps automatically.
 */
function resolveOssWebDeps(): Plugin {
  const appNodeModules = path.resolve(__dirname, "node_modules");

  return {
    name: "resolve-oss-web-deps",
    resolveId(source, importer) {
      if (!importer?.includes("/src/web/")) return null;

      // Skip relative imports and already-resolved paths
      if (source.startsWith(".") || source.startsWith("/")) return null;

      // Determine the package name (handles scoped packages and deep paths)
      const parts = source.split("/");
      const pkg = source.startsWith("@")
        ? parts.slice(0, 2).join("/")
        : parts[0];
      const subPath = source.startsWith("@")
        ? parts.slice(2).join("/")
        : parts.slice(1).join("/");

      // Try to resolve from app's node_modules
      try {
        const { createRequire } = require("module");
        const require_ = createRequire(appNodeModules + "/");

        if (subPath) {
          // Deep import: resolve package root, then construct file path
          // Try direct file resolution first
          const directPath = path.join(appNodeModules, pkg, subPath);
          const fs = require("fs");
          // Try with .js extension if no extension
          const candidates = [
            directPath,
            directPath + ".js",
            directPath + "/index.js",
          ];
          for (const candidate of candidates) {
            if (fs.existsSync(candidate)) return candidate;
          }
          // Fall back to require_.resolve for packages that support deep imports
          try {
            return require_.resolve(source);
          } catch {
            return null;
          }
        } else {
          return require_.resolve(source);
        }
      } catch {
        return null;
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const loadedEnv = loadEnv(mode, __dirname, "");
  const backendUrl = process.env.VITE_BACKEND_URL ?? loadedEnv.VITE_BACKEND_URL;
  if (!backendUrl) {
    throw new Error(
      "VITE_BACKEND_URL is required. Copy frontend/app/.env.example to frontend/app/.env.",
    );
  }

  return {
    plugins: [react(), resolveOssWebDeps()],
    resolve: {
      alias: [
        {
          find: /^@\/components\/ui(\/.+)?$/,
          replacement: path.resolve(__dirname, "../shared/components/ui$1"),
        },
        {
          find: /^@\/components\/shared(\/.+)?$/,
          replacement: path.resolve(__dirname, "../shared/components/shared$1"),
        },
        {
          find: "@flowconsole/ui",
          replacement: path.resolve(__dirname, "../shared"),
        },
        {
          find: "@flowconsole/web",
          replacement: path.resolve(__dirname, "../../src/web/index.ts"),
        },
        { find: "@", replacement: path.resolve(__dirname, ".") },
      ],
      // Ensure React is always resolved from a single location (prevents duplicate React)
      dedupe: [
        "react",
        "react-dom",
        "react-router-dom",
        "@xyflow/react",
        "@xyflow/system",
      ],
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
