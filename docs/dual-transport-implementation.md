# MCP AlexisHR Server: Dual Transport Implementation

## Overview

This document explains how the AlexisHR MCP server implements dual transport support for both modern Streamable HTTP and legacy SSE clients.

## Transport Types

The server supports two transport types:

1. **Streamable HTTP Transport** (modern)
   - Endpoint: `/mcp` (POST)
   - Session management via `mcp-session-id` header
   - Stateful connections with proper session initialization

2. **Server-Sent Events (SSE) Transport** (legacy)
   - Endpoints: `/sse` (GET) for establishing connection, `/messages` (POST) for sending commands
   - Session management via query parameter `?sessionId=...`
   - Compatible with older MCP clients that rely on SSE

## Authentication

All endpoints require JWT authentication:

- JWT token must be provided in the `Authorization` header as a Bearer token
- For Streamable HTTP: Token is injected into the request context
- For SSE: Token is stored in a shared `sessionTokens` map when a session is created on `/sse` and retrieved when messages come in on `/messages`

## Code Implementation

### Transport Storage

```typescript
// Store transports for each session type
const transports = {
  streamable: {} as Record<string, StreamableHTTPServerTransport>,
  sse: {} as Record<string, SSEServerTransport>
};

// Store JWT tokens by session ID for SSE transport
const sessionTokens = new Map<string, string>();
```

### Streamable HTTP Endpoint (`/mcp`)

- Handles session initialization and message processing
- Reuses existing sessions based on `mcp-session-id` header
- Creates new sessions for initialization requests
- Injects JWT token into request context for tool handlers

### SSE Endpoints (`/sse` and `/messages`)

- `/sse` (GET): Establishes SSE connection and stores JWT token
- `/messages` (POST): Processes commands and injects stored JWT token

## Testing

Two test scripts are provided:

1. `tests/test-mcp-http.sh`: Tests the Streamable HTTP transport
2. `tests/test-mcp-sse.sh`: Tests the SSE transport

These scripts demonstrate how to:
- Initialize sessions
- Execute MCP tools
- Handle authentication
- Process responses

## Considerations

- The SSE transport is considered legacy but is maintained for backward compatibility
- For new integrations, the Streamable HTTP transport is recommended
- Both transport types fully support the MCP contract and tool execution

## References

- [MCP Documentation](https://modelcontextprotocol.io/docs/concepts/tools)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
