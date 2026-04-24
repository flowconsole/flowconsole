import { z } from "zod";

const emptyToUndefined = (v) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const appEnvSchema = z.object({
  VITE_BACKEND_URL: z.string().url(),
  VITE_APP_URL: z.string().url(),
  VITE_WEBSITE_URL: z.string().url(),
  VITE_OPENREPLAY_PROJECT_KEY: z.preprocess(
    emptyToUndefined,
    z.string().trim().optional(),
  ),
  VITE_OPENREPLAY_INGEST_POINT: z.preprocess(
    emptyToUndefined,
    z.string().trim().url().optional(),
  ),
});

export const env = appEnvSchema.parse({
  VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
  VITE_APP_URL: import.meta.env.VITE_APP_URL,
  VITE_WEBSITE_URL: import.meta.env.VITE_WEBSITE_URL,
  VITE_OPENREPLAY_PROJECT_KEY: import.meta.env.VITE_OPENREPLAY_PROJECT_KEY,
  VITE_OPENREPLAY_INGEST_POINT: import.meta.env.VITE_OPENREPLAY_INGEST_POINT,
});
