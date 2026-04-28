import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(new URL(import.meta.url)));
const viewerRoot = resolve(here, '../..');
const distAssets = join(viewerRoot, 'dist', 'assets');

describe('bundle hygiene', () => {
  it('no chunk contains monaco', () => {
    let files: string[];
    try {
      files = readdirSync(distAssets).filter((f) => f.endsWith('.js'));
    } catch {
      execSync('pnpm build', { cwd: viewerRoot, stdio: 'pipe' });
      files = readdirSync(distAssets).filter((f) => f.endsWith('.js'));
    }

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = readFileSync(join(distAssets, file), 'utf-8');
      expect(content.toLowerCase()).not.toContain('monaco');
    }
  });

  it('total gzipped JS size is under 1.5 MB', () => {
    let files: string[];
    try {
      files = readdirSync(distAssets).filter((f) => f.endsWith('.js'));
    } catch {
      execSync('pnpm build', { cwd: viewerRoot, stdio: 'pipe' });
      files = readdirSync(distAssets).filter((f) => f.endsWith('.js'));
    }

    let totalGzipped = 0;
    for (const file of files) {
      const raw = readFileSync(join(distAssets, file));
      const gz = gzipSync(raw);
      totalGzipped += gz.length;
    }

    const limitBytes = 1.5 * 1024 * 1024;
    expect(totalGzipped).toBeLessThan(limitBytes);
  });
});
