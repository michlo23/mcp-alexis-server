#!/bin/bash

# This is a sample JWT token for testing
# In production, replace with your actual JWT token

# Test Streamable HTTP Transport
echo "Testing Streamable HTTP transport (modern)"

# Initialize session
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": "init1",
    "method": "initialize",
    "params": {
      "capability": "tools",
      "clientName": "Test Client",
      "clientVersion": "1.0"
    }
  }')

echo "Initialize response: $SESSION_RESPONSE"

# Extract session ID
SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"mcp-session-id":"[^"]*"' | cut -d'"' -f4)

echo "Session ID: $SESSION_ID"

if [ -z "$SESSION_ID" ]; then
  echo "Failed to get session ID"
  exit 1
fi

# Execute a tool (getAllEmployees)
echo "Executing getAllEmployees tool..."
TOOL_RESPONSE=$(curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "mcp-session-id: $SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": "exec1",
    "method": "execute",
    "params": {
      "name": "getAllEmployees",
      "input": {
        "limit": 5
      }
    }
  }')

echo "Tool execution response:"
echo "$TOOL_RESPONSE" | jq '.' || echo "$TOOL_RESPONSE"

# Close session
echo "Closing session..."
curl -s -X DELETE http://localhost:3000/mcp \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "mcp-session-id: $SESSION_ID"

echo "Test completed"
