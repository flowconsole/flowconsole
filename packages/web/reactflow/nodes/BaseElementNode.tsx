import {
  IconApi,
  IconBolt,
  IconBrandAws,
  IconCloud,
  IconCube,
  IconDatabase,
  IconDeviceMobile,
  IconPackage,
  IconRocket,
  IconRss,
  IconServer2,
  IconShieldHalf,
  IconSquareRounded,
  IconStack2,
  IconTool,
  IconUser,
  IconWorld,
} from '@tabler/icons-react';
import { type CSSProperties, type ReactNode } from 'react';
import type { ElementTone, ElementStatus, StylePreset } from '../../diagram/types';
import { toneToColor, resolveNodeStyles } from '../../diagram/theme';
import { HiddenHandles } from './HiddenHandles';
import './styles.css';

/** Fallback Tabler icon by shape class when the entity has no explicit icon. */
const shapeIcons: Record<string, typeof IconUser> = {
  person: IconUser,
  service: IconServer2,
  database: IconDatabase,
  queue: IconStack2,
  storage: IconPackage,
  boundary: IconSquareRounded,
};

/** Map named icon identifiers (from SDK style.icon or runtime defaults) to Tabler components. */
const namedIcons: Record<string, typeof IconUser> = {
  system: IconServer2,
  api: IconApi,
  gateway: IconShieldHalf,
  worker: IconTool,
  database: IconDatabase,
  cache: IconBolt,
  queue: IconStack2,
  topic: IconRss,
  deployment: IconRocket,
  cloud: IconCloud,
  user: IconUser,
  browser: IconWorld,
  mobile: IconDeviceMobile,
  kubernetes: IconCube,
  aws: IconBrandAws,
};

/**
 * Detects external icon references per SDK spec (plan 2026-04-15-sdk-alignment):
 * - `data:...;base64,...` → inline data URL
 * - `http://...` / `https://...` → external URL
 * - `/...` or `./...` or `../...` → relative/absolute filesystem path
 */
function isExternalIconRef(icon: string): boolean {
  return (
    icon.startsWith('data:') ||
    icon.startsWith('http://') ||
    icon.startsWith('https://') ||
    icon.startsWith('/') ||
    icon.startsWith('./') ||
    icon.startsWith('../')
  );
}

function statusColor(status?: ElementStatus) {
  switch (status) {
    case 'operational':
      return 'var(--diagram-success)';
    case 'degraded':
      return 'var(--diagram-warning)';
    case 'down':
      return 'var(--diagram-danger)';
    default:
      return 'var(--diagram-muted)';
  }
}

export type BaseElementNodeProps = {
  data: {
    title: string;
    subtitle?: string;
    description?: string;
    tags?: string[];
    badge?: string;
    tone?: ElementTone;
    status?: ElementStatus;
    icon?: string;
    ghost?: boolean;
    customColor?: string;
    customBackgroundColor?: string;
    customBorderColor?: string;
    preset?: StylePreset;
  };
  selected?: boolean;
  /** CSS class name for the shape variant, e.g. 'service', 'database'. */
  shapeClassName: string;
  /**
   * Callback that receives the resolved border/background colors.
   * Used by SVG shape nodes to apply fill/stroke to their SVG elements.
   */
  renderShapeBackground?: (resolved: { borderColor: string; backgroundColor?: string }) => ReactNode;
};

export function BaseElementNode({ data, selected, shapeClassName, renderShapeBackground }: BaseElementNodeProps) {
  const resolved = resolveNodeStyles({
    tone: data.tone,
    preset: data.preset,
    customColor: data.customColor,
    customBackgroundColor: data.customBackgroundColor,
    customBorderColor: data.customBorderColor,
  });
  const accent = toneToColor(data.tone);
  const rawIcon = data.icon?.trim();
  // Per SDK spec, style.icon can be one of four forms:
  //  1) external ref (data:/http(s)/path) → render as <img>
  //  2) named icon from built-in library → render Tabler SVG
  //  3) short literal (emoji/abbr ≤ 4 chars) → render as text
  //  4) empty → fall back to shapeClassName icon
  const externalIconUrl = rawIcon && isExternalIconRef(rawIcon) ? rawIcon : undefined;
  const mappedIcon = rawIcon && !externalIconUrl ? namedIcons[rawIcon.toLowerCase()] : undefined;
  const literalIcon = rawIcon && !externalIconUrl && !mappedIcon && rawIcon.length <= 4 ? rawIcon : undefined;
  const Icon = mappedIcon ?? shapeIcons[shapeClassName] ?? IconSquareRounded;
  const isGhost = data.ghost === true;
  const hasPresetClass = data.preset && data.preset !== 'default';
  // For SVG-backed shapes, keep root background transparent — the SVG handles fill.
  const hasSvgBackground = !!renderShapeBackground;
  const cardStyle = {
    borderColor: resolved.borderColor,
    backgroundColor: hasSvgBackground ? 'transparent' : resolved.backgroundColor,
    boxShadow: selected ? `0 0 0 2px ${resolved.borderColor}33, var(--diagram-card-shadow)` : undefined,
    '--diagram-accent': resolved.color ?? accent,
    opacity: resolved.opacity,
    ...(hasSvgBackground ? { border: 'none', boxShadow: selected ? `0 0 0 2px ${resolved.borderColor}33` : 'none' } : {}),
  } as CSSProperties;

  const effectiveShapeBg = renderShapeBackground
    ? renderShapeBackground({ borderColor: resolved.borderColor, backgroundColor: resolved.backgroundColor })
    : null;

  const presetClass = hasPresetClass ? ` diagram-card--${data.preset}` : '';

  return (
    <div
      className={`diagram-card diagram-card--${shapeClassName}${isGhost ? ' diagram-card--ghost' : ''}${presetClass}`}
      style={cardStyle}
    >
      {effectiveShapeBg ? (
        <div className="diagram-card__shape-bg" aria-hidden="true">
          {effectiveShapeBg}
        </div>
      ) : null}
      <div className="diagram-card__content">
        <div className="diagram-card__header">
          <div className="diagram-card__heading">
            <div className={`diagram-icon diagram-icon--${shapeClassName}`} style={{ borderColor: resolved.borderColor, color: resolved.color ?? accent }}>
              {externalIconUrl ? (
                <img
                  src={externalIconUrl}
                  alt=""
                  className="diagram-icon__image"
                  aria-hidden="true"
                />
              ) : literalIcon ? (
                <span className="diagram-icon__custom">{literalIcon}</span>
              ) : (
                <Icon size={18} stroke={1.8} aria-hidden="true" />
              )}
            </div>
            <div>
              <div className="diagram-card__title">{data.title}</div>
              {data.subtitle ? <div className="diagram-card__subtitle">{data.subtitle}</div> : null}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {data.badge ? (
              <span className="diagram-badge" style={{ borderColor: resolved.borderColor, color: resolved.color ?? accent }}>
                {data.badge}
              </span>
            ) : null}
            {data.status ? (
              <span className="diagram-status" style={{ background: statusColor(data.status) }} />
            ) : null}
          </div>
        </div>
        {data.description ? <div className="diagram-card__description">{data.description}</div> : null}
        {data.tags?.length ? (
          <div className="diagram-card__tags">
            {data.tags.map((tag: string) => (
              <span key={tag} className="diagram-tag">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <HiddenHandles />
    </div>
  );
}
