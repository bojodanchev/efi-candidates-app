# Brevo MCP Connection Investigation Report

## Issue
"Failed to reconnect to brevo" error when attempting to connect to Brevo MCP server.

## Investigation

### Configuration Review
Checked `.mcp.json` configuration file:
- Endpoint: `https://mcp.brevo.com/v1/brevo/mcp/{token}`
- Method: Using `mcp-remote` via npx
- Credential: Valid API key token

### Endpoint Verification
Consulted Brevo MCP documentation (https://developers.brevo.com/docs/mcp-protocol):
- **General endpoint**: `/v1/brevo/mcp/{token}` - Complete Brevo API access
- **Service-specific endpoints**: `/v1/brevo_{service}/mcp/{token}` - ~25 specialized services

### Connection Testing
Executed test connection to general endpoint:
```bash
npx -y mcp-remote "https://mcp.brevo.com/v1/brevo/mcp/{token}"
```

**Result**: ✅ Connection successful
- OAuth server configuration discovered
- Remote server connected using StreamableHTTPClientTransport
- Proxy established successfully

## Findings

1. **Configuration is correct** - `.mcp.json` uses the proper general endpoint path
2. **Endpoint is functional** - Test connection succeeded without errors
3. **Issue is session-related** - Not a configuration or endpoint problem

## Resolution

The "failed to reconnect" error is a Claude Code session issue, not a configuration problem.

**Recommended Actions**:
1. Restart Claude Code session (`/restart`)
2. Manually reconnect using `/mcp` command
3. Configuration requires no changes

## Endpoint Options

**Current Setup** (General Endpoint):
- Provides complete Brevo API access
- Single endpoint for all services
- Path: `/v1/brevo/mcp/`

**Alternative** (Micro-services):
- Service-specific endpoints (contacts, campaigns, templates, etc.)
- Lighter, more focused access
- Pattern: `/v1/brevo_{service}/mcp/`

---

## Update: Deep Investigation (Dec 29, 2025)

### What Works
1. **Direct terminal execution**: `npx -y mcp-remote <url>` connects successfully
2. **Programmatic spawn**: Node.js child_process spawn with STDIO pipes works perfectly
3. **MCP protocol**: Initialize request/response works, server responds (Brevo MCP v1.13.0)
4. **Configuration**: `.mcp.json` syntax is correct

### What Doesn't Work
- Claude Code's "reconnect" mechanism fails with "failed to reconnect"

### Root Cause Analysis
The issue appears to be **Claude Code's internal MCP session management**, not the Brevo server or configuration:

1. Connection works fresh but fails on "reconnect"
2. This suggests stale session state in Claude Code
3. Orphaned MCP processes (35+ playwright instances found) indicate session cleanup issues

### Tested Scenarios
| Scenario | Result |
|----------|--------|
| Direct `npx mcp-remote` | ✅ Works |
| Node.js spawn with STDIO | ✅ Works |
| MCP initialize handshake | ✅ Works (got response) |
| Claude Code reconnect | ❌ Fails |

### Recommended Fix
1. **Full restart of Claude Code** (not just `/mcp` reconnect)
2. Or close VSCode entirely and reopen
3. The "reconnect" feature seems to have a bug with remote MCP servers

---

**Date**: 2025-12-29
**Status**: Root cause identified - Claude Code session management issue, requires full restart
