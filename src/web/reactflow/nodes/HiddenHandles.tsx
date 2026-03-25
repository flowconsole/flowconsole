/* v8 ignore file -- @preserve */
import { Handle, Position } from '@xyflow/react';

/**
 * Invisible handles on all four sides of a node.
 * React Flow uses these as connection points for edges.
 * Having all four ensures edges connect correctly regardless of layout direction.
 */
export function HiddenHandles() {
  return (
    <>
      <Handle type="target" position={Position.Top} id="port-n" className="hidden-handle" isConnectable={false} />
      <Handle type="source" position={Position.Bottom} id="port-s" className="hidden-handle" isConnectable={false} />
      <Handle type="target" position={Position.Left} id="port-w" className="hidden-handle" isConnectable={false} />
      <Handle type="source" position={Position.Right} id="port-e" className="hidden-handle" isConnectable={false} />
    </>
  );
}
