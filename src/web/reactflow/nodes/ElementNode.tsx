import { IconDatabase, IconPackage, IconServer2, IconSquareRounded, IconStack2, IconUser } from '@tabler/icons-react';
import { type CSSProperties } from 'react';
import { type NodeProps } from '@xyflow/react';
import type { ElementNodeType } from '../../diagram/types';
import { defaultShapeRegistry } from '../../diagram/layout/shapes/builtins';
import type { ShapeRegistry } from '../../diagram/layout/shapes/shapeRegistry';
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

const geometryIcons = {
  card: IconServer2,
  pill: IconSquareRounded,
  person: IconUser,
  database: IconDatabase,
  queue: IconStack2,
  storage: IconPackage,
  gateway: IconSquareRounded,
  custom: IconSquareRounded,
} as const;

function statusColor(status: ElementNodeType['data']['status']) {
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

type ElementNodeProps = NodeProps<ElementNodeType> & {
  shapeRegistry?: ShapeRegistry;
};

function iconVariant(shapeId: string, geometryKind: string) {
  if (shapeId === 'database' || geometryKind === 'database') {
    return 'database';
  }
  if (shapeId === 'queue' || geometryKind === 'queue') {
    return 'queue';
  }
  if (shapeId === 'gateway' || geometryKind === 'gateway') {
    return 'gateway';
  }
  if (shapeId === 'person' || geometryKind === 'person') {
    return 'person';
  }
  return 'generic';
}

export function ElementNode({
  data,
  selected,
  shapeRegistry = defaultShapeRegistry,
}: ElementNodeProps) {
  const accent = toneToColor(data.tone);
  const requestedShapeId = data.notationShape ?? data.shape ?? 'service';
  const shapeDefinition = shapeRegistry.resolve(requestedShapeId, 'generic');
  const shapeId = shapeDefinition?.shapeId ?? 'generic';
  const geometryKind = shapeDefinition?.geometryKind ?? 'card';
  const visualShape = iconVariant(shapeId, geometryKind);
  const Icon = shapeIcons[shapeId] ?? geometryIcons[geometryKind] ?? IconSquareRounded;
  const customIcon = data.icon?.trim();
  const cardStyle = {
    borderColor: accent,
    boxShadow: selected ? `0 0 0 2px ${accent}33, var(--diagram-card-shadow)` : undefined,
    '--diagram-accent': accent,
  } as CSSProperties;

  return (
    <div
      className={`diagram-card ${shapeDefinition?.renderClassName ?? 'diagram-card--generic'}`}
      style={cardStyle}
      data-shape-id={shapeId}
      data-shape-geometry={geometryKind}
    >
      <div className={`diagram-card__shell diagram-card__shell--${geometryKind}`} aria-hidden="true" />
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
