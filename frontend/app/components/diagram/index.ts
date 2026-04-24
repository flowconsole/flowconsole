/**
 * Diagram module — app-specific diagram composition around @flowconsole/web and @xyflow/react.
 *
 * IMPORTANT: Reusable graph rendering primitives, node/edge types, and diagram engine logic
 * belong in flowconsole/packages/web (the OSS repo), NOT here.
 *
 * This module owns ONLY:
 * - App-specific toolbars and filter bars wrapping the OSS diagram canvas
 * - Source toggle UI (Git, CodeScan, InfraScan, Import, Observability)
 * - App-specific diagram layout presets and configuration
 *
 * Consume @flowconsole/web for the actual rendering engine.
 */

// Re-exports will be added as components are created in Task 6
