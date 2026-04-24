# FlowConsole Backend

ASP.NET Core backend for FlowConsole — an Architecture as Code platform with a queryable live graph, drift detection, fitness functions, and graph analytics.

## Quick Start

```bash
# Restore and build
dotnet restore src/FlowConsole.slnx
dotnet build src/FlowConsole.slnx

# Run tests
dotnet test src/FlowConsole.slnx --verbosity quiet

# Run the API server (default: http://localhost:5000)
dotnet run --project src/FlowConsole.Api
```

## Docker Compose

The `docker/docker-compose.yml` brings up the full stack:

```bash
docker compose -f docker/docker-compose.yml up
```

Services:

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `postgres` | `apache/age:release_PG16_1.6.0` | 5432 | PostgreSQL with Apache AGE graph extension |
| `ollama` | `ollama/ollama:latest` | 11434 | Local LLM inference server |
| `ollama-pull` | `ollama/ollama:latest` | — | Init container — pulls default model (`qwen3:8b`) on first start |
| `api` | Built from `docker/Dockerfile` | 5555 → 8080 | FlowConsole API |

### Changing the LLM model

The default model is `qwen3:8b` (via Ollama). To use a different OpenAI-compatible model, set environment variables:

```yaml
# In docker-compose.yml or docker-compose.override.yml
api:
  environment:
    Llm__Model: "your-model-name"
    Llm__BaseUrl: "http://ollama:11434/v1"  # or any OpenAI-compatible endpoint
    Llm__ApiKey: "your-api-key"             # if required by the provider
```

To disable AI features entirely, set `Llm__Enabled: "false"`.

## MCP Server — Connecting AI Agents

FlowConsole exposes an [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) Streamable HTTP server at `/mcp`, allowing AI assistants to explore your architectural model in read-only mode. All 18 tools enforce the same authorization and access checks as the REST API.

### Authentication

Two auth methods are supported:

- **JWT token** — obtain via `POST /auth/login`, short-lived
- **Personal Access Token (PAT)** — create via `POST /api/v1/account/tokens` (requires JWT), long-lived, format `fcp_<random>`. Recommended for MCP clients.

```bash
# Get a JWT token
curl -s -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "your-password"}'

# Create a PAT (using JWT)
curl -s -X POST http://localhost:5000/api/v1/account/tokens \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "mcp-client"}'
# Response: {"id":"...","name":"mcp-client","token":"fcp_abc123..."} — save the token, it won't be shown again
```

### Client Configuration

#### Claude Desktop

Edit `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`, Linux: `~/.config/Claude/`):

```json
{
  "mcpServers": {
    "flowconsole": {
      "url": "http://localhost:5000/mcp",
      "headers": {
        "Authorization": "Bearer fcp_your-pat-token"
      }
    }
  }
}
```

#### Cursor

Create `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "flowconsole": {
      "url": "http://localhost:5000/mcp",
      "headers": {
        "Authorization": "Bearer fcp_your-pat-token"
      }
    }
  }
}
```

#### VS Code Copilot

Add to your VS Code `settings.json`:

```json
{
  "mcp": {
    "servers": {
      "flowconsole": {
        "type": "http",
        "url": "http://localhost:5000/mcp",
        "headers": {
          "Authorization": "Bearer fcp_your-pat-token"
        }
      }
    }
  }
}
```

#### Testing with curl

```bash
# Initialize MCP session
curl -X POST http://localhost:5000/mcp \
  -H "Authorization: Bearer fcp_your-pat-token" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'

# List available tools
curl -X POST http://localhost:5000/mcp \
  -H "Authorization: Bearer fcp_your-pat-token" \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: <session-id-from-initialize>" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

### Available Tools (18)

**Navigation** (4 tools) — browse projects and models:

| Tool | Description |
|------|-------------|
| `list_projects` | List architecture projects you have access to |
| `get_project` | Get project details by ID |
| `list_models` | List architecture models in a project |
| `get_model` | Get model details by ID |

**Elements** (3 tools) — search and inspect architecture elements:

| Tool | Description |
|------|-------------|
| `search_elements` | Search elements with filters (query, kind, tag, parentId) |
| `get_element` | Get element details by ID |
| `list_relationships` | List relationships with optional source/target filters |

**Analytics** (7 tools) — graph analysis and metrics:

| Tool | Description |
|------|-------------|
| `get_dependencies` | Direct dependencies of an element |
| `get_dependents` | Elements that depend on a given element |
| `get_blast_radius` | Transitive impact analysis (configurable depth 1-10) |
| `get_shortest_path` | Shortest dependency path between two elements |
| `get_analytics_summary` | Coupling, cohesion, communities, bottleneck counts |
| `get_coupling` | Afferent/efferent coupling and instability per element |
| `get_bottlenecks` | Single points of failure and bottleneck elements |

**Intelligence** (4 tools) — drift detection, validation, and queries:

| Tool | Description |
|------|-------------|
| `get_latest_drift` | Latest drift snapshot (added/removed/changed elements) |
| `get_latest_validation` | Latest validation run summary (pass/fail counts, drift score) |
| `list_validation_results` | Validation findings with optional severity filter (error/warning/info/critical) |
| `execute_query` | Run structured or command queries against the graph |

### Example Scenarios

Once connected, ask your AI assistant questions like:

- "Show me all projects and their models" — uses `list_projects` + `list_models`
- "What services does order-service depend on?" — uses `search_elements` to find the service, then `get_dependencies`
- "What's the blast radius if payment-gateway goes down?" — uses `get_blast_radius` with the element ID
- "Find the shortest path between frontend-app and the database" — uses `get_shortest_path`
- "Are there any architecture violations?" — uses `get_latest_validation` + `list_validation_results`
- "Show me the current drift between model and infrastructure" — uses `get_latest_drift`
- "Which elements are bottlenecks?" — uses `get_bottlenecks`
- "What's the coupling analysis for the system?" — uses `get_coupling`

### Authorization

All MCP tools enforce the same authorization as the REST API. Each tool checks project membership via the user's JWT or PAT claims. Accessing a model or project you don't have access to returns an error message (not an HTTP error — MCP tools return error strings in their response).
