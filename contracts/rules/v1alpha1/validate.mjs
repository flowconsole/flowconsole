#!/usr/bin/env node

/**
 * Validates YAML/JSON rule files and conformance expected files against
 * FlowConsole RuleFile v1alpha1 JSON Schemas.
 *
 * Usage:
 *   node validate.mjs conformance/ingest/valid/*.yaml
 *   node validate.mjs conformance/ingest/invalid/*.yaml --expect-errors
 *   node validate.mjs --check-expected
 *
 * Flags:
 *   --expect-errors    Inverts exit code: success if ALL files fail validation
 *   --quiet            Only print successes in compact form
 *   --check-expected   Validate all *.expected.json files against their conformance schemas
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let Ajv, yaml;
try {
  Ajv = require("ajv/dist/2020").default;
  yaml = require("js-yaml");
} catch {
  console.error(
    "Missing dependencies. Run from oss/ root:\n  pnpm add -D ajv js-yaml"
  );
  process.exit(2);
}

const args = process.argv.slice(2);
const expectErrors = args.includes("--expect-errors");
const quiet = args.includes("--quiet");
const checkExpected = args.includes("--check-expected");
const patterns = args.filter((a) => !a.startsWith("--"));

function expandGlob(pattern) {
  if (!pattern.includes("*")) return [pattern];
  const dir = dirname(pattern);
  const suffix = basename(pattern).replace("*", "");
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(suffix))
      .sort()
      .map((f) => join(dir, f));
  } catch {
    console.error(`Warning: directory '${dir}' not found for pattern '${pattern}'`);
    return [];
  }
}

function collectExpectedFiles(baseDir) {
  const results = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".expected.json")) results.push(full);
    }
  }
  walk(baseDir);
  return results.sort();
}

function detectExpectedSchema(filePath) {
  if (filePath.includes("/ingest/valid/")) return "normalized-result";
  if (filePath.includes("/ingest/invalid/") || filePath.includes("/ingest/invalid-semantic/")) return "diagnostics-result";
  if (filePath.includes("/expressions/")) return "expression-result";
  return null;
}

const ajv = new Ajv({ strict: true, allErrors: true });

function runRuleFileValidation() {
  const files = patterns.flatMap(expandGlob);

  if (files.length === 0) {
    console.error("No files matched. Usage: node validate.mjs <file.yaml|file.json> [--expect-errors] [--quiet]");
    process.exit(2);
  }

  const schemaPath = resolve(__dirname, "rule-file.schema.json");
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const validate = ajv.compile(schema);

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const raw = readFileSync(resolve(file), "utf8");
    const ext = file.endsWith(".json") ? "json" : "yaml";
    let data;
    try {
      data = ext === "json" ? JSON.parse(raw) : yaml.load(raw);
    } catch (e) {
      console.log(`✗ ${file} — parse error: ${e.message}`);
      failed++;
      continue;
    }

    const ok = validate(data);

    if (expectErrors) {
      if (!ok) {
        if (!quiet) console.log(`✓ ${file} — correctly rejected (${validate.errors.length} error(s))`);
        passed++;
      } else {
        console.log(`✗ ${file} — expected errors but passed validation`);
        failed++;
      }
    } else {
      if (ok) {
        if (!quiet) console.log(`✓ ${file}`);
        passed++;
      } else {
        console.log(`✗ ${file}`);
        for (const e of validate.errors) {
          console.log(`    ${e.instancePath || "/"} — ${e.message}`);
        }
        failed++;
      }
    }
  }

  console.log(`\n${passed} passed, ${failed} failed out of ${files.length}`);
  return failed;
}

function runExpectedValidation() {
  const conformanceDir = resolve(__dirname, "conformance");
  if (!existsSync(conformanceDir)) {
    console.error(`Conformance directory not found: ${conformanceDir}`);
    process.exit(2);
  }

  const schemasDir = resolve(conformanceDir, "expected-schemas");
  const schemaCache = new Map();

  function getValidator(schemaName) {
    if (schemaCache.has(schemaName)) return schemaCache.get(schemaName);
    const schemaPath = resolve(schemasDir, `${schemaName}.schema.json`);
    if (!existsSync(schemaPath)) {
      console.error(`Schema not found: ${schemaPath}`);
      return null;
    }
    const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
    const validate = ajv.compile(schema);
    schemaCache.set(schemaName, validate);
    return validate;
  }

  const files = collectExpectedFiles(conformanceDir);
  if (files.length === 0) {
    console.error("No *.expected.json files found");
    process.exit(2);
  }

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  console.log("Validating expected files against conformance schemas:\n");

  for (const file of files) {
    const schemaName = detectExpectedSchema(file);
    if (!schemaName) {
      console.log(`? ${file} — unknown category, skipped`);
      skipped++;
      continue;
    }

    const validate = getValidator(schemaName);
    if (!validate) {
      console.log(`✗ ${file} — schema '${schemaName}' not loadable`);
      failed++;
      continue;
    }

    let data;
    try {
      data = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
      console.log(`✗ ${file} — JSON parse error: ${e.message}`);
      failed++;
      continue;
    }

    const ok = validate(data);
    if (ok) {
      if (!quiet) console.log(`✓ ${file} [${schemaName}]`);
      passed++;
    } else {
      console.log(`✗ ${file} [${schemaName}]`);
      for (const e of validate.errors) {
        console.log(`    ${e.instancePath || "/"} — ${e.message}`);
      }
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped out of ${files.length}`);
  return failed;
}

const failures = checkExpected ? runExpectedValidation() : runRuleFileValidation();
process.exit(failures > 0 ? 1 : 0);
