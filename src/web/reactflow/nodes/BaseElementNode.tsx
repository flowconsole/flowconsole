import { IconDatabase, IconPackage, IconServer2, IconSquareRounded, IconStack2, IconUser } from '@tabler/icons-react';
import { type CSSProperties, type ReactNode } from 'react';
import type { ElementTone, ElementStatus } from '../../diagram/types';
import { toneToColor } from '../../diagram/theme';
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
  };
  selected?: boolean;
  /** CSS class name for the shape variant, e.g. 'service', 'database'. */
  shapeClassName: string;
  /** Optional SVG layer rendered behind the content for non-rectangular shapes. */
  shapeBackground?: ReactNode;
};

export function BaseElementNode({ data, selected, shapeClassName, shapeBackground }: BaseElementNodeProps) {
  const accent = toneToColor(data.tone);
  const visualShape = shapeClassName in shapeIcons ? shapeClassName : 'generic';
  const Icon = shapeIcons[shapeClassName] ?? IconSquareRounded;
  const customIcon = data.icon?.trim();
  const isGhost = data.ghost === true;
  const cardStyle = {
    borderColor: accent,
    boxShadow: selected ? `0 0 0 2px ${accent}33, var(--diagram-card-shadow)` : undefined,
    '--diagram-accent': accent,
  } as CSSProperties;

  return (
    <div
      className={`diagram-card diagram-card--${visualShape}${isGhost ? ' diagram-card--ghost' : ''}`}
      style={cardStyle}
    >
      {shapeBackground ? (
        <div className="diagram-card__shape-bg" aria-hidden="true">
          {shapeBackground}
        </div>
      ) : (
        <div className={`diagram-card__shell diagram-card__shell--${visualShape}`} aria-hidden="true" />
      )}
      <div className="diagram-card__content">
        <div className="diagram-card__header">
          <div className="diagram-card__heading">
            <div className={`diagram-icon diagram-icon--${visualShape}`} style={{ borderColor: accent, color: accent }}>
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
              <span className="diagram-badge" style={{ borderColor: accent, color: accent }}>
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
