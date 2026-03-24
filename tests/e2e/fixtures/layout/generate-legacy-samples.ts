/**
 * Generate legacy sample fixtures from codeSamplesOld DSL evaluation.
 * Run with: npx tsx tests/e2e/fixtures/layout/generate-legacy-samples.ts
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateDiagramCode } from '../../../../src/web/languages/typescript/evaluateDiagramCode';
import { codeSamplesOld } from '../../../../src/web/languages/typescript/samples';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const fixtures = [];
  for (const sample of codeSamplesOld) {
    const result = await evaluateDiagramCode(sample.code);
    if (!result.ok) {
      throw new Error(`Failed to evaluate ${sample.id}: ${result.error}`);
    }
    const containers = result.model.nodes
      .filter((n) => n.type === 'container')
      .map((n) => ({
        id: n.id,
        title: n.data.title,
        parentId: n.parentId,
        childCount: result.model.nodes.filter((c) => c.parentId === n.id).length,
      }));

    fixtures.push({
      id: sample.id,
      title: sample.title,
      model: result.model,
      containers,
    });
  }
  const outPath = resolve(__dirname, 'legacy-samples.json');
  writeFileSync(outPath, JSON.stringify(fixtures, null, 2));
  console.log(`Generated ${fixtures.length} fixtures to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
