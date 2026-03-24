import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearRoleEnricherCache, enrichNodeRoles } from '../../../../src/web/diagram/layout/llm/roleEnricher';
import type { LLMEnricherConfig, NodeRole } from '../../../../src/web/diagram/layout/types';

const nodes = [
  { id: 'redis', title: 'Redis', technology: 'Redis' },
  { id: 'api', title: 'API Server' },
  { id: 'web', title: 'Web Frontend' },
];

const edges = [
  { source: 'web', target: 'api', label: 'HTTP' },
  { source: 'api', target: 'redis' },
];

// 100% processor → above threshold
const allProcessorRoles = new Map<string, NodeRole>([
  ['redis', 'processor'],
  ['api', 'processor'],
  ['web', 'processor'],
]);

const goodRoles = new Map<string, NodeRole>([
  ['redis', 'store'],
  ['api', 'processor'],
  ['web', 'frontend'],
]);

function makeConfig(overrides: Partial<LLMEnricherConfig> = {}): LLMEnricherConfig {
  return {
    enabled: true,
    endpoint: 'http://localhost:11434/v1/chat/completions',
    model: 'qwen2.5:7b',
    timeoutMs: 3000,
    processorThreshold: 0.3,
    cache: true,
    ...overrides,
  };
}

describe('enrichNodeRoles', () => {
  beforeEach(() => {
    clearRoleEnricherCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns current roles when disabled', async () => {
    const result = await enrichNodeRoles(nodes, edges, allProcessorRoles, makeConfig({ enabled: false }));
    expect(result).toEqual(allProcessorRoles);
  });

  it('skips LLM when processor ratio is below threshold', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    // goodRoles has 1/3 processor ≈ 33%, set threshold to 0.5 to ensure skip
    const result = await enrichNodeRoles(nodes, edges, goodRoles, makeConfig({ processorThreshold: 0.5 }));
    expect(result).toEqual(goodRoles);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('updates roles from successful LLM response', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: '{"redis": "cache", "web": "frontend", "api": "processor"}',
          },
        }],
      }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    const result = await enrichNodeRoles(nodes, edges, allProcessorRoles, makeConfig());

    expect(result.get('redis')).toBe('cache');
    expect(result.get('web')).toBe('frontend');
    expect(result.get('api')).toBe('processor');
  });

  it('returns current roles on invalid LLM response', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'not valid json at all' } }],
      }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    const result = await enrichNodeRoles(nodes, edges, allProcessorRoles, makeConfig());
    expect(result).toEqual(allProcessorRoles);
  });

  it('returns current roles on network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const result = await enrichNodeRoles(nodes, edges, allProcessorRoles, makeConfig());
    expect(result).toEqual(allProcessorRoles);
  });

  it('returns current roles on timeout', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('Aborted', 'AbortError'));

    const result = await enrichNodeRoles(nodes, edges, allProcessorRoles, makeConfig());
    expect(result).toEqual(allProcessorRoles);
  });

  it('uses cache on second call with same graph', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: '{"redis": "store", "web": "frontend", "api": "processor"}',
          },
        }],
      }),
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    await enrichNodeRoles(nodes, edges, allProcessorRoles, makeConfig());
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Second call — should use cache
    const result2 = await enrichNodeRoles(nodes, edges, allProcessorRoles, makeConfig());
    expect(fetchSpy).toHaveBeenCalledTimes(1); // Not called again
    expect(result2.get('redis')).toBe('store');
  });

  it('ignores invalid role values from LLM', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: '{"redis": "invalid_role", "web": "frontend", "api": "banana"}',
          },
        }],
      }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as Response);

    const result = await enrichNodeRoles(nodes, edges, allProcessorRoles, makeConfig());
    expect(result.get('redis')).toBe('processor'); // unchanged — invalid role
    expect(result.get('web')).toBe('frontend'); // valid
    expect(result.get('api')).toBe('processor'); // unchanged — invalid role
  });
});
