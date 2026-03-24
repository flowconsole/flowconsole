import type { LLMEnricherConfig, NodeRole } from '../types';

const NODE_ROLES: ReadonlySet<string> = new Set<NodeRole>([
  'entry', 'frontend', 'gateway', 'processor', 'store',
  'cache', 'queue', 'external', 'orchestrator', 'infrastructure',
]);

const roleCache = new Map<string, Map<string, NodeRole>>();

function buildPrompt(
  nodes: ReadonlyArray<{ id: string; title: string; technology?: string }>,
  edges: ReadonlyArray<{ source: string; target: string; label?: string }>
): string {
  const nodeList = nodes
    .map((n) => `- ${n.id}: "${n.title}"${n.technology ? ` (${n.technology})` : ''}`)
    .join('\n');
  const edgeList = edges
    .map((e) => `- ${e.source} → ${e.target}${e.label ? `: "${e.label}"` : ''}`)
    .join('\n');

  return [
    'Classify each node into exactly one role based on its name, technology, and connections.',
    '',
    'Valid roles: entry, frontend, gateway, processor, store, cache, queue, external, orchestrator, infrastructure',
    '',
    'Nodes:',
    nodeList,
    '',
    'Edges:',
    edgeList || '(none)',
    '',
    'Return ONLY valid JSON: {"nodeId": "role", ...}',
  ].join('\n');
}

function computeCacheKey(
  nodes: ReadonlyArray<{ id: string; title: string; technology?: string }>
): string {
  return nodes
    .map((n) => `${n.id}:${n.title}:${n.technology ?? ''}`)
    .sort()
    .join('|');
}

export async function enrichNodeRoles(
  nodes: ReadonlyArray<{ id: string; title: string; technology?: string }>,
  edges: ReadonlyArray<{ source: string; target: string; label?: string }>,
  currentRoles: ReadonlyMap<string, NodeRole>,
  config: LLMEnricherConfig
): Promise<Map<string, NodeRole>> {
  const result = new Map(currentRoles);

  if (!config.enabled) return result;

  // Threshold check: if less than threshold are "processor", rule-based was sufficient
  const processorCount = [...currentRoles.values()].filter((r) => r === 'processor').length;
  const processorRatio = currentRoles.size > 0 ? processorCount / currentRoles.size : 0;
  if (processorRatio < config.processorThreshold) return result;

  // Cache check
  const cacheKey = computeCacheKey(nodes);
  if (config.cache) {
    const cached = roleCache.get(cacheKey);
    if (cached) return new Map(cached);
  }

  try {
    const prompt = buildPrompt(nodes, edges);
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
    });

    if (!response.ok) return result;

    const body = await response.json();
    const content: string = body?.choices?.[0]?.message?.content ?? '';

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return result;

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>;

    for (const [nodeId, role] of Object.entries(parsed)) {
      if (currentRoles.has(nodeId) && NODE_ROLES.has(role)) {
        result.set(nodeId, role as NodeRole);
      }
    }

    // Cache the result
    if (config.cache) {
      roleCache.set(cacheKey, new Map(result));
    }
  } catch {
    // On ANY error (network, timeout, parse) — return currentRoles unchanged
  }

  return result;
}

export function clearRoleEnricherCache() {
  roleCache.clear();
}
