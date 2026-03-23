import { IconZoomScan } from '@tabler/icons-react';
import { type NodeProps } from '@xyflow/react';
import { useCallback } from 'react';
import type { ContainerNodeType } from '../../diagram/types';
import { defaultShapeRegistry } from '../../diagram/layout/shapes/builtins';
import type { ShapeRegistry } from '../../diagram/layout/shapes/shapeRegistry';
import { toneToColor } from '../../diagram/theme';
import { HiddenHandles } from './HiddenHandles';
import './styles.css';

type ContainerNodeProps = NodeProps<ContainerNodeType> & {
  shapeRegistry?: ShapeRegistry;
};

export function ContainerNode({
  id,
  data,
  selected,
  shapeRegistry = defaultShapeRegistry,
}: ContainerNodeProps) {
  const accent = toneToColor(data.tone ?? 'muted');
  const isCollapsed = data.expanded === false;
  const canOpen = data.showOpenButton !== false;
  const shapeDefinition = shapeRegistry.resolve(data.notationShape ?? 'boundary', 'boundary');
  const handleOpen = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      window.dispatchEvent(new CustomEvent('container:open', { detail: { id } }));
    },
    [id]
  );

  return (
    <div
      className={`diagram-container ${shapeDefinition?.renderClassName ?? 'diagram-container'} diagram-container--${
        shapeDefinition?.geometryKind ?? 'card'
      }`}
      style={{
        borderColor: accent,
        boxShadow: selected ? `0 0 0 2px ${accent}22, var(--diagram-card-shadow)` : undefined,
        position: 'relative',
      }}
      data-shape-id={shapeDefinition?.shapeId ?? 'boundary'}
      data-shape-geometry={shapeDefinition?.geometryKind ?? 'card'}
    >
      {isCollapsed ? (
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            width: '100%',
            height: '100%',
          }}
        >
          {canOpen ? (
            <button
              onClick={handleOpen}
              aria-label="Open container"
              className="diagram-container__open-button"
              style={{
                border: `1px solid ${accent}`,
                color: accent,
              }}
            >
              <IconZoomScan size={16} stroke={1.85} aria-hidden="true" />
            </button>
          ) : null}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              minWidth: 0,
            }}
          >
            <span
              className="diagram-card__title"
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
                textAlign: 'center',
                fontSize: '20px',
                lineHeight: 1.1,
              }}
            >
              {data.title}
            </span>
            {data.description ? (
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--diagram-text-muted)',
                  textAlign: 'center',
                  maxWidth: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {data.description}
              </span>
            ) : null}
            {typeof data.childCount === 'number' && data.childCount > 0 ? (
              <span style={{ fontSize: 10, opacity: 0.7 }}></span>
            ) : null}
            {data.badge ? (
              <span className="diagram-badge" style={{ borderColor: accent, color: accent }}>
                {data.badge}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="diagram-container__header" style={{ alignItems: 'flex-start', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <div className="diagram-card__title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {data.title}
                </span>
              </div>
              {data.subtitle ? <div className="diagram-card__subtitle">{data.subtitle}</div> : null}
            </div>
            {data.badge ? (
              <span className="diagram-badge" style={{ borderColor: accent, color: accent }}>
                {data.badge}
              </span>
            ) : null}
          </div>
          {data.description ? <div className="diagram-container__body">{data.description}</div> : null}
        </>
      )}

      <HiddenHandles />
    </div>
  );
}
