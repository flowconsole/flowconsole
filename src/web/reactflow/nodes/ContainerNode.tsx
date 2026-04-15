import { IconZoomScan } from '@tabler/icons-react';
import { type NodeProps } from '@xyflow/react';
import { useCallback } from 'react';
import type { ContainerNodeType } from '../../diagram/types';
import { toneToColor, resolveNodeStyles } from '../../diagram/theme';
import { HiddenHandles } from './HiddenHandles';
import './styles.css';

export function ContainerNode({ id, data, selected }: NodeProps<ContainerNodeType>) {
  const resolved = resolveNodeStyles({
    tone: data.tone ?? 'muted',
    preset: data.preset,
    customColor: data.customColor,
    customBackgroundColor: data.customBackgroundColor,
    customBorderColor: data.customBorderColor,
  });
  const accent = toneToColor(data.tone ?? 'muted');
  const isCollapsed = data.expanded === false;
  const hasPresetClass = data.preset && data.preset !== 'default';
  const handleOpen = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      window.dispatchEvent(new CustomEvent('container:open', { detail: { id } }));
    },
    [id]
  );

  return (
    <div
      className={`diagram-container${hasPresetClass ? ` diagram-container--${data.preset}` : ''}`}
      style={{
        borderColor: resolved.borderColor,
        backgroundColor: resolved.backgroundColor,
        boxShadow: selected ? `0 0 0 2px ${resolved.borderColor}22, var(--diagram-card-shadow)` : undefined,
        opacity: resolved.opacity,
        position: 'relative',
      }}
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
          {data.showOpenButton !== false ? (
            <button
              onClick={handleOpen}
              aria-label="Open container"
              className="diagram-container__open-button"
              style={{
                border: `1px solid ${resolved.borderColor}`,
                color: resolved.borderColor,
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
              <span style={{ fontSize: 10, opacity: 0.7 }}>{data.childCount} elements</span>
            ) : null}
            {data.badge ? (
              <span className="diagram-badge" style={{ borderColor: resolved.borderColor, color: resolved.color ?? accent }}>
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
              <span className="diagram-badge" style={{ borderColor: resolved.borderColor, color: resolved.color ?? accent }}>
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
