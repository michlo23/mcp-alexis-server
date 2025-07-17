import express from 'express';
import getRawBody from 'raw-body';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

import { PORT, SERVER_INFO } from './config';
import { validateJwtToken } from './auth/jwtAuth';
import { registerAllTools } from './tools';

// Create Express app
const app = express();

// Middleware
app.use(express.json());

// Configure CORS for browser-based MCP clients
app.use(cors({
  origin: '*', // Configure appropriately for production
  exposedHeaders: ['Mcp-Session-Id'],
  allowedHeaders: ['Content-Type', 'mcp-session-id', 'Authorization'],
}));

// Create MCP server
const server = new McpServer(SERVER_INFO);

// Register all MCP tools
registerAllTools(server);

// Store transports for each session type
const transports = {
  streamable: {} as Record<string, StreamableHTTPServerTransport>,
  sse: {} as Record<string, SSEServerTransport>
};

// Store JWT tokens by session ID for SSE transport
const sessionTokens = new Map<string, string>();

// Apply JWT authentication middleware to MCP routes
app.use(['/mcp', '/sse', '/messages'], validateJwtToken);

// Modern Streamable HTTP endpoint for current clients
app.post('/mcp', async (req, res) => {
  try {
    // Get the auth context - extract JWT token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    // Check for existing session ID
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    
    // Get the raw body first
    const rawBody = await getRawBody(req, {
      limit: '1mb',
      encoding: 'utf-8'
    });
    
    // Parse the message body
    const messageBody = JSON.parse(rawBody.toString());
    
    // Check if this is an initialize request
    const isInitRequest = messageBody.method === 'initialize' && 
                         messageBody.jsonrpc === '2.0' &&
                         messageBody.params && 
                         messageBody.params.capability === 'tools';
    
    let transport: StreamableHTTPServerTransport;
    if (sessionId && transports.streamable[sessionId]) {
      // Reuse existing transport
      transport = transports.streamable[sessionId];
    } else if (!sessionId && isInitRequest) {
      // New initialization request - create a new transport
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid: string) => {
          // Store the transport by session ID
          transports.streamable[sid] = transport;
        },
        // Enable DNS rebinding protection if running in production
        enableDnsRebindingProtection: process.env.NODE_ENV === 'production',
      });
      
      // Clean up transport when closed
      transport.onclose = () => {
        if (transport.sessionId) {
          console.log(`Cleaning up streamable session ${transport.sessionId}`);
          delete transports.streamable[transport.sessionId];
        }
      };
      
      // Connect transport to MCP server
      await server.connect(transport);
    } else {
      // Invalid request
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
    }
    
    // Inject token into context for tool handlers
    if (!messageBody.params) {
      messageBody.params = {};
    }
    messageBody.params.context = { jwtToken: token };
        
    await transport.handleRequest(req, res, messageBody);
  } catch (error) {
    console.error('Error handling streamable HTTP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Internal Server Error',
        },
        id: null,
      });
    }
  }
});

// Legacy SSE endpoint for older clients
app.get('/sse', async (req, res) => {
  try {
    // Get the auth context - extract JWT token
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return res.status(401).send('Unauthorized');
    }
    
    // Create SSE transport
    const transport = new SSEServerTransport('/messages', res);
    transports.sse[transport.sessionId] = transport;
    
    // Clean up on connection close
    res.on('close', () => {
      console.log(`Cleaning up SSE session ${transport.sessionId}`);
      delete transports.sse[transport.sessionId];
    });
    
    // Store the token in a shared context map to access it when handling messages
    sessionTokens.set(transport.sessionId, token);
    
    // Connect transport to MCP server
    await server.connect(transport);
  } catch (error) {
    console.error('Error handling SSE request:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
});
// Legacy message endpoint for older clients
app.post('/messages', async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      return res.status(400).send('No sessionId provided');
    }
    
    const transport = transports.sse[sessionId];
    if (!transport) {
      return res.status(400).send('No transport found for sessionId');
    }
    
    // Get token from Authorization header if available
    const authHeader = req.headers.authorization;
    let token = authHeader?.split(' ')[1];
    
    // If no token in header, try to get the stored token for this session
    if (!token) {
      token = sessionTokens.get(sessionId);
      if (!token) {
        return res.status(401).send('Unauthorized: No valid token found');
      }
    } else {
      // Update the stored token for this session
      sessionTokens.set(sessionId, token);
    }
    
    // Add token to the request context
    if (!req.body.params) {
      req.body.params = {};
    }
    req.body.params.context = { token };
    
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error('Error handling message request:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
});

// Simple health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`AlexisHR MCP Server listening on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`MCP endpoints: /mcp (modern), /sse and /messages (legacy)`);
});
