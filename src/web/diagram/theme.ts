import type { ElementTone, RelationshipKind, StylePreset } from './types';

/**
 * Preset style overrides. Each preset defines a base palette that can be
 * further overridden by explicit custom colors.
 * Priority: explicit custom colors > preset > tone > default theme.
 */
export const presetStyles: Record<StylePreset, { borderColor?: string; backgroundColor?: string; opacity?: number }> = {
  default: {},
  highlighted: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  critical: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  deprecated: {
    borderColor: '#6b7280',
    backgroundColor: 'rgba(107, 114, 128, 0.06)',
    opacity: 0.6,
  },
  new: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  external: {
    borderColor: '#8b5cf6',
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
  },
};

/**
 * Resolve the style overrides for a given preset.
 * Returns an empty object for 'default' or undefined preset.
 */
export function resolvePresetStyle(preset?: StylePreset): { borderColor?: string; backgroundColor?: string; opacity?: number } {
  if (!preset || preset === 'default') return {};
  return presetStyles[preset] ?? {};
}

/**
 * Resolve the final border/background/color values applying the priority chain:
 * explicit custom colors > preset > tone > default theme.
 */
export function resolveNodeStyles(opts: {
  tone?: ElementTone;
  preset?: StylePreset;
  customColor?: string;
  customBackgroundColor?: string;
  customBorderColor?: string;
}): { borderColor: string; backgroundColor?: string; color?: string; opacity?: number } {
  const toneAccent = toneToColor(opts.tone);
  const presetOverrides = resolvePresetStyle(opts.preset);

  return {
    borderColor: opts.customBorderColor ?? presetOverrides.borderColor ?? toneAccent,
    backgroundColor: opts.customBackgroundColor ?? presetOverrides.backgroundColor ?? undefined,
    color: opts.customColor ?? undefined,
    opacity: presetOverrides.opacity,
  };
}

export function toneToColor(tone: ElementTone = 'primary') {
  switch (tone) {
    case 'success':
      return 'var(--diagram-success)';
    case 'warning':
      return 'var(--diagram-warning)';
    case 'danger':
      return 'var(--diagram-danger)';
    case 'muted':
      return 'var(--diagram-muted)';
    default:
      return 'var(--diagram-primary)';
  }
}

export function relationshipStroke(kind: RelationshipKind = 'dependency') {
  const muted = toneToColor('muted');
  switch (kind) {
    case 'sync':
      return { stroke: muted, activeStroke: toneToColor('primary'), strokeDasharray: undefined };
    case 'async':
      return { stroke: muted, activeStroke: toneToColor('success'), strokeDasharray: '6 6' };
    case 'event':
      return { stroke: muted, activeStroke: toneToColor('warning'), strokeDasharray: '2 6' };
    default:
      return { stroke: muted, activeStroke: muted, strokeDasharray: undefined };
  }
}
