import { Position } from '@xyflow/react';
import type { LayoutDirection } from './types';

export type PortSide = Position.Left | Position.Right | Position.Top | Position.Bottom;

export type Port = {
  side: PortSide;
  offset: number; // 0..1 along side
};

type PortModel = 'card' | 'sides' | 'database' | 'queue' | 'gateway' | 'person';

function flowInputSide(direction: LayoutDirection): PortSide {
  switch (direction) {
    case 'RL': return Position.Right;
    case 'TB': return Position.Top;
    case 'BT': return Position.Bottom;
    default: return Position.Left;
  }
}

function flowOutputSide(direction: LayoutDirection): PortSide {
  switch (direction) {
    case 'RL': return Position.Left;
    case 'TB': return Position.Bottom;
    case 'BT': return Position.Top;
    default: return Position.Right;
  }
}

function oppositeSide(side: PortSide): PortSide {
  switch (side) {
    case Position.Left: return Position.Right;
    case Position.Right: return Position.Left;
    case Position.Top: return Position.Bottom;
    case Position.Bottom: return Position.Top;
    default: return side;
  }
}

/**
 * Select source and target ports based on shape port model and layout direction.
 *
 * Port models:
 * - card: standard rectangle, ports follow flow direction
 * - sides: ports on all four sides (person shape)
 * - database: input from "top" of cylinder, output from sides/bottom
 * - queue: flow-through element, input from flow-in side, output from flow-out side
 * - gateway: input from client-facing side, output to backend side
 * - person: edges depart from bottom (person usually at top of diagram)
 */
export function selectPorts(
  sourcePortModel: PortModel | string,
  targetPortModel: PortModel | string,
  direction: LayoutDirection
): { sourcePort: Port; targetPort: Port } {
  const sourcePort = selectSourcePort(sourcePortModel, direction);
  const targetPort = selectTargetPort(targetPortModel, direction);
  return { sourcePort, targetPort };
}

function selectSourcePort(portModel: PortModel | string, direction: LayoutDirection): Port {
  switch (portModel) {
    case 'person':
      return { side: Position.Bottom, offset: 0.5 };
    case 'queue':
      return { side: flowOutputSide(direction), offset: 0.5 };
    case 'gateway':
      return { side: flowOutputSide(direction), offset: 0.5 };
    case 'database':
      return { side: flowOutputSide(direction), offset: 0.5 };
    default: // card, sides, unknown
      return { side: flowOutputSide(direction), offset: 0.5 };
  }
}

function selectTargetPort(portModel: PortModel | string, direction: LayoutDirection): Port {
  switch (portModel) {
    case 'person':
      return { side: Position.Bottom, offset: 0.5 };
    case 'database': {
      // Database input goes to the "cap" (top) in TB, or flow-input side in LR
      const isVertical = direction === 'TB' || direction === 'BT';
      return { side: isVertical ? Position.Top : flowInputSide(direction), offset: 0.5 };
    }
    case 'queue':
      return { side: flowInputSide(direction), offset: 0.5 };
    case 'gateway':
      return { side: flowInputSide(direction), offset: 0.5 };
    default: // card, sides, unknown
      return { side: flowInputSide(direction), offset: 0.5 };
  }
}

/**
 * Compute anchor point on a node boundary for a given port.
 */
export function portToAnchorPoint(
  port: Port,
  bounds: { x: number; y: number; width: number; height: number }
): { x: number; y: number } {
  switch (port.side) {
    case Position.Left:
      return { x: bounds.x, y: bounds.y + bounds.height * port.offset };
    case Position.Right:
      return { x: bounds.x + bounds.width, y: bounds.y + bounds.height * port.offset };
    case Position.Top:
      return { x: bounds.x + bounds.width * port.offset, y: bounds.y };
    case Position.Bottom:
      return { x: bounds.x + bounds.width * port.offset, y: bounds.y + bounds.height };
    default:
      return { x: bounds.x, y: bounds.y };
  }
}

export { oppositeSide, flowInputSide, flowOutputSide };
