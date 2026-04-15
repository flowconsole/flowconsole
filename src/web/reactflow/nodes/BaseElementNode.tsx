import { IconDatabase, IconPackage, IconServer2, IconSquareRounded, IconStack2, IconUser } from '@tabler/icons-react';
import { type CSSProperties, type ReactNode } from 'react';
import type { ElementTone, ElementStatus, StylePreset } from '../../diagram/types';
import { toneToColor, resolveNodeStyles } from '../../diagram/theme';
import { HiddenHandles } from './HiddenHandles';
import './styles.css';

const shapeIcons: Record<string, typeof IconUser> = {
  person: IconUser,
  service: IconServer2,
  database: IconDatabase,
  queue: IconStack2,
  storage: IconPackage,
  boundary: IconSquareRounded,
};

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
  /** Optional SVG layer rendered behind the content for non-rectangular shapes. */
  shapeBackground?: ReactNode;
  /**
   * Callback that receives the resolved border/background colors.
   * Used by SVG shape nodes to apply fill/stroke to their SVG elements.
   */
  renderShapeBackground?: (resolved: { borderColor: string; backgroundColor?: string }) => ReactNode;
};

export function BaseElementNode({ data, selected, shapeClassName, shapeBackground, renderShapeBackground }: BaseElementNodeProps) {
  const resolved = resolveNodeStyles({
    tone: data.tone,
    preset: data.preset,
    customColor: data.customColor,
    customBackgroundColor: data.customBackgroundColor,
    customBorderColor: data.customBorderColor,
  });
  const accent = toneToColor(data.tone);
  const visualShape = shapeClassName;
  const Icon = shapeIcons[shapeClassName] ?? IconSquareRounded;
  const customIcon = data.icon?.trim();
  const isGhost = data.ghost === true;
  const hasPresetClass = data.preset && data.preset !== 'default';
  const cardStyle = {
    borderColor: resolved.borderColor,
    backgroundColor: resolved.backgroundColor,
    boxShadow: selected ? `0 0 0 2px ${resolved.borderColor}33, var(--diagram-card-shadow)` : undefined,
    '--diagram-accent': resolved.color ?? accent,
    opacity: resolved.opacity,
  } as CSSProperties;

  const effectiveShapeBg = renderShapeBackground
    ? renderShapeBackground({ borderColor: resolved.borderColor, backgroundColor: resolved.backgroundColor })
    : shapeBackground;

  const presetClass = hasPresetClass ? ` diagram-card--${data.preset}` : '';

  return (
    <div
      className={`diagram-card diagram-card--${visualShape}${isGhost ? ' diagram-card--ghost' : ''}${presetClass}`}
      style={cardStyle}
    >
      {effectiveShapeBg ? (
        <div className="diagram-card__shape-bg" aria-hidden="true">
          {effectiveShapeBg}
        </div>
      ) : (
        <div className={`diagram-card__shell diagram-card__shell--${visualShape}`} aria-hidden="true" />
      )}
      <div className="diagram-card__content">
        <div className="diagram-card__header">
          <div className="diagram-card__heading">
            <div className={`diagram-icon diagram-icon--${visualShape}`} style={{ borderColor: resolved.borderColor, color: resolved.color ?? accent }}>
              {customIcon ? (
                <span className="diagram-icon__custom">{customIcon}</span>
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
            <span className="diagram-status" style={{ background: statusColor(data.status) }} />
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
