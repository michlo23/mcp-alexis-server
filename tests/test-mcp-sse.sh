#!/bin/bash

# This is a sample JWT token for testing
# In production, replace with your actual JWT token
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"

# Test SSE Transport
echo "Testing legacy SSE transport"

# Generate a random session ID
SESSION_ID="session-$(date +%s)"

# Start listening for SSE events in the background
echo "Starting SSE connection..."
curl -N -s -H "Authorization: Bearer $JWT_TOKEN" \
  "http://localhost:3000/sse?sessionId=$SESSION_ID" > sse_output.txt &
SSE_PID=$!

# Sleep briefly to ensure SSE connection is established
sleep 1

# Execute a tool through the messages endpoint
echo "Executing getAllEmployees tool..."
TOOL_RESPONSE=$(curl -s -X POST "http://localhost:3000/messages?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
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

# Display any SSE events received
echo "Received SSE events:"
sleep 2
cat sse_output.txt

# Kill the SSE listener
kill $SSE_PID
rm sse_output.txt

echo "Test completed"
