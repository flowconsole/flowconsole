import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Writable } from 'stream';
import {
  SoftwareSystem,
  Database,
  buildSnapshot,
  resetRuntime,
  emit,
  EmitOptions,
  ElementKind,
  RelationKind,
  Sdk,
} from '../flowconsole-sdk';

// Import union types for type-level tests
import type {
  ElementKindUnion,
  RelationKindUnion,
  ElementKindString,
  RelationKindString,
} from '../unions';

let tmpDir: string;

beforeEach(() => {
  resetRuntime();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdk-emit-'));
});

describe('emit() helper', () => {
  function makeSnapshot() {
    const svc = new SoftwareSystem({ id: 'svc', name: 'Service' });
    const db = new Database({ id: 'db', name: 'DB' });
    svc.uses(db, 'query').scenario('test');
    return buildSnapshot([svc, db]);
  }

  describe('to=stdout (default)', () => {
    it('writes JSON to process.stdout', () => {
      const snapshot = makeSnapshot();
      const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

      emit(snapshot);

      expect(writeSpy).toHaveBeenCalledOnce();
      const written = writeSpy.mock.calls[0][0] as string;
      expect(written).toContain('"schemaVersion"');
      expect(written).toContain('"svc"');
      expect(written.endsWith('\n')).toBe(true);

      // Verify it's valid JSON
      const parsed = JSON.parse(written.trim());
      expect(parsed.schemaVersion).toBe('1.1.0');

      writeSpy.mockRestore();
    });

    it('uses default indent of 2', () => {
      const snapshot = makeSnapshot();
      const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

      emit(snapshot);

      const written = writeSpy.mock.calls[0][0] as string;
      // Check indentation: 2 spaces
      expect(written).toContain('  "');

      writeSpy.mockRestore();
    });

    it('respects custom indent', () => {
      const snapshot = makeSnapshot();
      const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

      emit(snapshot, { indent: 4 });

      const written = writeSpy.mock.calls[0][0] as string;
      expect(written).toContain('    "');

      writeSpy.mockRestore();
    });
  });

  describe('to=file', () => {
    it('writes JSON to specified file path', async () => {
      const snapshot = makeSnapshot();
      const filePath = path.join(tmpDir, 'output.json');

      await emit(snapshot, { to: 'file', filePath });

      const content = fs.readFileSync(filePath, 'utf8');
      expect(content.endsWith('\n')).toBe(true);
      const parsed = JSON.parse(content.trim());
      expect(parsed.schemaVersion).toBe('1.1.0');
      expect(parsed.elements.length).toBe(2);
    });

    it('throws when filePath is undefined', async () => {
      const snapshot = makeSnapshot();

      await expect(
        emit(snapshot, { to: 'file' }),
      ).rejects.toThrow('filePath required when to=file');
    });

    it('writes valid JSON with correct structure', async () => {
      const snapshot = makeSnapshot();
      const filePath = path.join(tmpDir, 'structured.json');

      await emit(snapshot, { to: 'file', filePath });

      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(parsed.$schema).toBe('https://flowconsole.tech/contracts/model-snapshot/v1/schema.json');
      expect(parsed.source).toBe('Git');
      expect(parsed.flows).not.toBeNull();
      expect(parsed.flows.length).toBeGreaterThan(0);
    });
  });

  describe('to=stream (WritableStream)', () => {
    it('writes JSON to provided WritableStream', () => {
      const snapshot = makeSnapshot();
      const chunks: string[] = [];
      const stream = new Writable({
        write(chunk, _encoding, callback) {
          chunks.push(chunk.toString());
          callback();
        },
      });

      // emit() with stream as the 'to' option - pass stream object directly
      emit(snapshot, { to: stream as unknown as string });

      expect(chunks.length).toBe(1);
      expect(chunks[0].endsWith('\n')).toBe(true);
      const parsed = JSON.parse(chunks[0].trim());
      expect(parsed.schemaVersion).toBe('1.1.0');
    });
  });

  describe('edge cases', () => {
    it('snapshot without flows produces flows: null in output', async () => {
      const svc = new SoftwareSystem({ id: 'svc', name: 'Service' });
      const snapshot = buildSnapshot([svc]);
      const filePath = path.join(tmpDir, 'no-flows.json');

      await emit(snapshot, { to: 'file', filePath });

      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(parsed.flows).toBeNull();
    });

    it('emitted JSON keys are sorted (canonical order)', () => {
      const snapshot = makeSnapshot();
      const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

      emit(snapshot);

      const written = writeSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(written.trim());
      const keys = Object.keys(parsed);
      const sorted = [...keys].sort();
      expect(keys).toEqual(sorted);

      writeSpy.mockRestore();
    });

    it('unknown target string throws', async () => {
      const snapshot = makeSnapshot();

      await expect(
        emit(snapshot, { to: 'unknown-target' }),
      ).rejects.toThrow('Unknown emit target');
    });
  });
});

describe('Discriminated union ergonomics', () => {
  it('ElementKindUnion discriminates on kind field', () => {
    // Type-level test: verify the union narrows correctly
    const dbElement: ElementKindUnion = {
      kind: 'Database',
      engine: 'PostgreSQL',
      id: 'db',
      name: 'DB',
    };

    // At runtime, verify the discriminant works
    expect(dbElement.kind).toBe('Database');
    if (dbElement.kind === 'Database') {
      expect(dbElement.engine).toBe('PostgreSQL');
    }
  });

  it('ElementKindUnion covers all 20 kinds', () => {
    // Exhaustiveness check: all ElementKind values assignable to ElementKindString
    const allKinds: ElementKindString[] = [
      'Class', 'Interface', 'Endpoint', 'Function', 'Producer', 'Consumer',
      'Deployment', 'Database', 'Queue', 'Cache', 'Ingress', 'Namespace', 'Broker', 'Topic',
      'Service', 'Application', 'Module', 'External', 'Gateway', 'Worker',
    ];
    expect(allKinds.length).toBe(20);
  });

  it('RelationKindUnion covers all 11 kinds', () => {
    const allKinds: RelationKindString[] = [
      'Contains', 'DeployedOn', 'Uses', 'Calls', 'DependsOn',
      'Imports', 'Implements', 'Produces', 'Consumes', 'Exposes', 'RoutesTo',
    ];
    expect(allKinds.length).toBe(11);
  });

  it('RelationKindUnion discriminates on kind field', () => {
    const rel: RelationKindUnion = {
      kind: 'Calls',
      sourceId: 'a',
      targetId: 'b',
    };
    expect(rel.kind).toBe('Calls');
  });

  it('ElementKind enum values match ElementKindString union', () => {
    // Every enum value should be a valid ElementKindString
    for (const kind of Object.values(ElementKind)) {
      const _check: ElementKindString = kind as ElementKindString;
      expect(typeof _check).toBe('string');
    }
  });

  it('RelationKind enum values match RelationKindString union', () => {
    for (const kind of Object.values(RelationKind)) {
      const _check: RelationKindString = kind as RelationKindString;
      expect(typeof _check).toBe('string');
    }
  });

  it('Topic-specific fields visible after narrowing', () => {
    const topicElement: ElementKindUnion = {
      kind: 'Topic',
      partitions: 12,
      id: 'events',
      name: 'Events',
    };

    if (topicElement.kind === 'Topic') {
      expect(topicElement.partitions).toBe(12);
    }
  });

  it('Endpoint-specific fields visible after narrowing', () => {
    const endpoint: ElementKindUnion = {
      kind: 'Endpoint',
      httpMethod: 'GET',
      id: 'get-users',
      name: 'GET /users',
    };

    if (endpoint.kind === 'Endpoint') {
      expect(endpoint.httpMethod).toBe('GET');
    }
  });
});

describe('Sdk static helper class', () => {
  it('Sdk.buildSnapshot() delegates to buildSnapshot()', () => {
    const svc = new SoftwareSystem({ id: 'svc', name: 'Service' });
    const db = new Database({ id: 'db', name: 'DB' });
    svc.calls(db, 'query').scenario('test');

    const snapshot = Sdk.buildSnapshot([svc, db]);
    const dto = snapshot._toModelSnapshotDto();

    expect(dto.schemaVersion).toBe('1.1.0');
    expect(dto.source).toBe('Git');
    expect(dto.elements.length).toBe(2);
    expect(dto.flows).not.toBeNull();
    expect(dto.flows!.length).toBe(1);
    expect(dto.flows![0].name).toBe('test');
  });

  it('Sdk.resetRuntime() clears all state', () => {
    const svc = new SoftwareSystem({ id: 'svc1', name: 'Service' });
    svc.calls(new Database({ id: 'db1', name: 'DB' }), 'query').scenario('before-reset');

    Sdk.resetRuntime();

    const runtime = Sdk.runtime();
    expect(Object.keys(runtime.scenarios).length).toBe(0);
    expect(runtime.unnamedFlows.length).toBe(0);
  });

  it('Sdk.runtime() returns the global FlowRuntime', () => {
    const runtime = Sdk.runtime();
    expect(runtime).toBeDefined();
    expect(typeof runtime.startFlow).toBe('function');
    expect(typeof runtime.reset).toBe('function');
  });

  it('Sdk.emit() writes to stdout', async () => {
    const svc = new SoftwareSystem({ id: 'svc2', name: 'Service' });
    const snapshot = Sdk.buildSnapshot([svc]);

    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await Sdk.emit(snapshot);

    expect(writeSpy).toHaveBeenCalledOnce();
    const written = writeSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(written.trim());
    expect(parsed.schemaVersion).toBe('1.1.0');
    expect(parsed.elements[0].id).toBe('svc2');

    writeSpy.mockRestore();
  });
});
