# Deferred Ideas

Items considered during development but intentionally deferred. Not committed to — kept here as a backlog for future evaluation.

## `fcon view` enhancements

- Auto-refresh without F5 — file watcher + SSE push to browser
- Element inspector side panel — click a node to see properties, tags, annotations
- Diff overlay — `fcon view --diff baseline.json` highlights added/removed/changed elements
- Export to PNG/SVG from the viewer
- `fcon view --watch` — restart-free scanner re-run on source file changes
- Auto-migration of v0.x snapshots to current schema version
- ETag/mtime weak validator on `/api/snapshot` for conditional responses
