#!/usr/bin/env node

/**
 * Validates JSON model snapshot files against FlowConsole ModelSnapshot v1 JSON Schema
 * plus post-schema semantic checks (version, reference integrity).
 *
 * Usage:
 *   node validate.mjs conformance/valid/*.json
 *   node validate.mjs conformance/invalid/*.json --expect-errors
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

let Ajv;
try {
  Ajv = require("ajv/dist/2020").default;
} catch {
  console.error(
    "Missing dependencies. Run from oss/ root:\n  pnpm add -D ajv"
  );
  process.exit(2);
}

const args = process.argv.slice(2);
const expectErrors = args.includes("--expect-errors");
const quiet = args.includes("--quiet");
const checkExpected = args.includes("--check-expected");
const patterns = args.filter((a) => !a.startsWith("--") && !a.endsWith(".expected.json"));

function expandGlob(pattern) {
  if (!pattern.includes("*")) return [pattern];
  const dir = dirname(pattern);
  const suffix = basename(pattern).replace("*", "");
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(suffix) && !f.endsWith(".expected.json"))
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

/** Post-schema semantic validation (version, reference integrity) */
function runSemanticChecks(data) {
  const errors = [];

  // Version phase: check major version
  if (data.schemaVersion) {
    const major = parseInt(data.schemaVersion.split(".")[0], 10);
    if (major !== 1) {
      errors.push(`version: major version ${major} does not match supported major 1`);
    }
  }

  // Reference phase: duplicate element IDs
  if (Array.isArray(data.elements)) {
    const ids = new Set();
    for (let i = 0; i < data.elements.length; i++) {
      const el = data.elements[i];
      if (el && el.id) {
        if (ids.has(el.id)) {
          errors.push(`reference: duplicate element id '${el.id}' at /elements/${i}`);
        }
        ids.add(el.id);
      }
    }

    // Reference phase: unresolved relationship targets
    if (Array.isArray(data.relationships)) {
      for (let i = 0; i < data.relationships.length; i++) {
        const rel = data.relationships[i];
        if (rel && rel.sourceId && !ids.has(rel.sourceId)) {
          errors.push(`reference: relationship source '${rel.sourceId}' not found at /relationships/${i}/sourceId`);
        }
        if (rel && rel.targetId && !ids.has(rel.targetId)) {
          errors.push(`reference: relationship target '${rel.targetId}' not found at /relationships/${i}/targetId`);
        }
      }
    }
  }

  return errors;
}

const ajv = new Ajv({ strict: false, allErrors: true });

function runSnapshotValidation() {
  const files = patterns.flatMap(expandGlob);

  if (files.length === 0) {
    console.error("No files matched. Usage: node validate.mjs <file.json> [--expect-errors] [--quiet]");
    process.exit(2);
  }

  const schemaPath = resolve(__dirname, "schema.json");
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const validate = ajv.compile(schema);

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const raw = readFileSync(resolve(file), "utf8");
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      if (expectErrors) {
        if (!quiet) console.log(`\u2713 ${file} \u2014 correctly rejected (parse error)`);
        passed++;
      } else {
        console.log(`\u2717 ${file} \u2014 parse error: ${e.message}`);
        failed++;
      }
      continue;
    }

    const schemaOk = validate(data);
    const semanticErrors = schemaOk ? runSemanticChecks(data) : [];
    const ok = schemaOk && semanticErrors.length === 0;
    const totalErrors = schemaOk ? semanticErrors.length : validate.errors.length;

    if (expectErrors) {
      if (!ok) {
        if (!quiet) console.log(`\u2713 ${file} \u2014 correctly rejected (${totalErrors} error(s))`);
        passed++;
      } else {
        console.log(`\u2717 ${file} \u2014 expected errors but passed validation`);
        failed++;
      }
    } else {
      if (ok) {
        if (!quiet) console.log(`\u2713 ${file}`);
        passed++;
      } else {
        console.log(`\u2717 ${file}`);
        if (!schemaOk) {
          for (const e of validate.errors) {
            console.log(`    ${e.instancePath || "/"} \u2014 ${e.message}`);
          }
        }
        for (const e of semanticErrors) {
          console.log(`    ${e}`);
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

  console.log("Validating expected files against conformance schemas:\n");

  for (const file of files) {
    const validate = getValidator("diagnostics-result");
    if (!validate) {
      console.log(`\u2717 ${file} \u2014 schema 'diagnostics-result' not loadable`);
      failed++;
      continue;
    }

    let data;
    try {
      data = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
      console.log(`\u2717 ${file} \u2014 JSON parse error: ${e.message}`);
      failed++;
      continue;
    }

    const ok = validate(data);
    if (ok) {
      if (!quiet) console.log(`\u2713 ${file} [diagnostics-result]`);
      passed++;
    } else {
      console.log(`\u2717 ${file} [diagnostics-result]`);
      for (const e of validate.errors) {
        console.log(`    ${e.instancePath || "/"} \u2014 ${e.message}`);
      }
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed out of ${files.length}`);
  return failed;
}

const failures = checkExpected ? runExpectedValidation() : runSnapshotValidation();
process.exit(failures > 0 ? 1 : 0);
