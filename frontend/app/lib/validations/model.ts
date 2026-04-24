import * as z from "zod";

const thresholdField = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === "number" && Number.isNaN(value)) {
      return undefined;
    }

    return value;
  },
  z.number().min(0).max(100),
);

const notifyField = z.union([
  z.literal(""),
  z.null(),
  z.coerce.number().min(0).max(100),
]);

export const createModelSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().nullable(),
  metaSchemaId: z.string().trim().min(1, "Meta-schema is required").nullable(),
  gitConfig: z.object({
    repoUrl: z.union([
      z.literal(""),
      z.string().url("Repository URL must be a valid URL"),
    ]),
    branch: z.string(),
    pathPatterns: z.object({
      dsl: z.array(z.string()),
      code: z.array(z.string()),
      infra: z.array(z.string()),
    }),
    providerConfig: z
      .object({
        type: z.literal("direct"),
        username: z.string().optional(),
        password: z.string().optional(),
      })
      .nullable(),
  }),
  driftConfig: z.object({
    autoEnabled: z.boolean(),
    sources: z.array(z.string()),
    threshold: thresholdField,
    notifyOnScoreBelow: notifyField,
  }),
});
