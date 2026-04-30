/**
 * SDK styles showcase fixture.
 * One component per shape and preset for acceptance testing.
 */

// Circle shape via explicit style override
export const circleShapeCode = `const gw: Gateway = { name: "Circle GW", style: { shape: "circle" } };`;

// Hexagon shape (Gateway default)
export const hexagonShapeCode = `const gw: Gateway = { name: "Hex GW" };`;

// Cloud shape (External default)
export const cloudShapeCode = `const ext: External = { name: "Cloud Ext" };`;

// Rectangle / default shape
export const rectangleShapeCode = `const api: RestApi = { name: "Rect API" };`;

// Cylinder shape (Database default)
export const cylinderShapeCode = `const db: Database = { name: "Cyl DB" };`;

// Pipe shape (Queue default)
export const pipeShapeCode = `const q: Queue = { name: "Pipe Q" };`;

// Person shape (User default)
export const personShapeCode = `const u: User = { name: "Person U" };`;

export const customBgColorOnRectCode = `const svc: RestApi = { name: "Red BG", style: { backgroundColor: "#e74c3c" } };`;

export const customBgColorOnCircleCode = `const gw: Gateway = { name: "Red Circle", style: { shape: "circle", backgroundColor: "#e74c3c" } };`;

export const customBorderColorOnRectCode = `const svc: RestApi = { name: "Red Border", style: { borderColor: "#c0392b" } };`;

export const customBorderColorOnHexagonCode = `const gw: Gateway = { name: "Red Hex", style: { borderColor: "#c0392b" } };`;

export const deprecatedPresetCode = `const svc: RestApi = { name: "Deprecated", style: { preset: "deprecated" } };`;

export const highlightedPresetCode = `const svc: RestApi = { name: "Highlighted", style: { preset: "highlighted" } };`;

export const criticalPresetCode = `const svc: RestApi = { name: "Critical", style: { preset: "critical" } };`;

export const deprecatedWithGreenBorderCode = `const svc: RestApi = { name: "Override", style: { preset: "deprecated", borderColor: "#00ff00" } };`;

export const fullShowcaseCode = [
  `const circ: Gateway = { name: "Circle", style: { shape: "circle" } };`,
  `const hex: Gateway = { name: "Hexagon" };`,
  `const cloud: External = { name: "Cloud" };`,
  `const rect: RestApi = { name: "Rectangle" };`,
  `const db: Database = { name: "Database" };`,
  `const q: Queue = { name: "Queue" };`,
  `const u: User = { name: "Person" };`,
  `const dep: RestApi = { name: "Deprecated", style: { preset: "deprecated" } };`,
  `const hl: RestApi = { name: "Highlighted", style: { preset: "highlighted" } };`,
  `const crit: RestApi = { name: "Critical", style: { preset: "critical" } };`,
  `const nw: RestApi = { name: "New", style: { preset: "new" } };`,
  `const ext2: RestApi = { name: "External Preset", style: { preset: "external" } };`,
].join('\n');
