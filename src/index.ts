import express from 'express';
import getRawBody from 'raw-body';
import cors from 'cors';
import http from 'http';
import { randomUUID } from 'crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import { PORT, SERVER_INFO, MCP_TIMEOUT } from './config';
import { registerAllTools } from './tools';
import { validateJwtToken } from './auth/jwtAuth';

// Create Express app
const app = express();

// Set server timeout for long requests
app.use((req, res, next) => {
  res.setTimeout(MCP_TIMEOUT, () => {
    console.log('Request timed out:', req.url);
  });
  next();
});

// Middleware
app.use((req, res, next) => {
    if (req.path.startsWith('/mcp')) return next(); // MCP potrzebuje raw-body
    express.json()(req, res, next); // reszta może korzystać z parsera
  });
  
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

// Store transports for session management
const httpTransports: Record<string, StreamableHTTPServerTransport> = {};
const sseTransports: Record<string, SSEServerTransport> = {};

// Apply JWT authentication middleware to MCP routes
app.use(['/mcp', '/sse', '/messages'], validateJwtToken);

// Combined MCP endpoint for all transport types
app.all('/mcp', async (req, res) => {
  try {
    // Get the auth context - extract JWT token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    const transportType = req.query.transportType as string | undefined;
    
    // Handle SSE transport
    if (transportType === 'sse') {
      if (req.method !== 'GET') {
        return res.status(405).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'SSE requires GET method' },
          id: null
        });
      }
      
      // Configure response for long-lived SSE connection
      req.socket.setTimeout(MCP_TIMEOUT);
      if (res.connection) {
        res.connection.setTimeout(MCP_TIMEOUT);
      }
      
      // Disable response buffering for SSE
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Create SSE transport with extended timeout
      const sseTransport = new SSEServerTransport('/messages', res);
      console.log(`SSE transport created with ${MCP_TIMEOUT/1000}s timeout`);
      
      // Store transport for management
      const sessionId = randomUUID();
      sseTransports[sessionId] = sseTransport;
      
      // Setup cleanup when connection closes
      req.on('close', () => {
        console.log(`SSE connection closed, cleaning up session ${sessionId}`);
        delete sseTransports[sessionId];
      });
      
      // Connect transport to MCP server
      await server.connect(sseTransport);
      
      // SSE transport handles the response automatically when created with the response object
    }
    
    // Handle streamable HTTP transport
    if (transportType === 'streamable-http' || !transportType) {
      if (req.method !== 'POST') {
        return res.status(405).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Streamable HTTP requires POST method' },
          id: null
        });
      }
      
      // Get raw body and parse as JSON
      const rawBody = await getRawBody(req, {
        limit: '1mb',
        encoding: 'utf-8'
      });
      const messageBody = JSON.parse(rawBody.toString());
      
      // Check session ID
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;
      
      if (sessionId && httpTransports[sessionId]) {
        // Reuse existing transport
        transport = httpTransports[sessionId];
      } else if (!sessionId && isInitializeRequest(messageBody)) {
        // Create new transport for initialization request
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            httpTransports[sid] = transport;
          },
          enableDnsRebindingProtection: process.env.NODE_ENV === 'production',
        });
        
        // Set up cleanup on close
        transport.onclose = () => {
          if (transport.sessionId) {
            console.log(`Cleaning up streamable session ${transport.sessionId}`);
            delete httpTransports[transport.sessionId];
          }
        };
        
        // Connect to server
        await server.connect(transport);
      } else {
        // Invalid request
        return res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Missing or invalid session ID',
          },
          id: null,
        });
      }
      
      // Inject token into request context
      if (!messageBody.params) {
        messageBody.params = {};
      }
      messageBody.params.context = { jwtToken: token };
      
      // Handle the request
      return await transport.handleRequest(req, res, messageBody);
    }
    
    // Unsupported transport type
    return res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Unsupported transport type',
      },
      id: null,
    });
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal Server Error',
        },
        id: null,
      });
    }
  }
});

// Keep legacy SSE endpoints for backward compatibility
// Legacy SSE endpoint
app.get('/sse', async (req, res) => {
  try {
    // Get the auth context - extract JWT token
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return res.status(401).send('Unauthorized');
    }
    
    // Create SSE transport and connect to server
    const sseTransport = new SSEServerTransport('/messages', res);
    
    // Store transport for session management
    sseTransports[sseTransport.sessionId] = sseTransport;
    
    // Clean up on connection close
    res.on('close', () => {
      console.log(`Cleaning up SSE session ${sseTransport.sessionId}`);
      delete sseTransports[sseTransport.sessionId];
    });
    
    // Connect transport to MCP server
    await server.connect(sseTransport);
  } catch (error) {
    console.error('Error handling legacy SSE request:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
});

// Legacy messages endpoint
app.post('/messages', async (req, res) => {
  try {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      return res.status(400).send('No sessionId provided');
    }
    
    // For legacy POST requests, always get token from authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return res.status(401).send('Unauthorized');
    }
    
    // Add token to the request context
    if (!req.body.params) {
      req.body.params = {};
    }
    req.body.params.context = { jwtToken: token };
    
    // For legacy messages endpoint
    const sseTransport = sseTransports[sessionId];
    
    if (!sseTransport) {
      return res.status(400).send('No transport found for sessionId');
    }
    
    // Handle the message using the transport
    await sseTransport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error('Error handling legacy message request:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
});

// Simple health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'ok' });
});

// Start server with extended timeout
const httpServer = http.createServer(app);

// Set server timeouts
httpServer.timeout = MCP_TIMEOUT;
httpServer.keepAliveTimeout = MCP_TIMEOUT / 2;
httpServer.headersTimeout = MCP_TIMEOUT;

httpServer.listen(PORT, () => {
  console.log(`AlexisHR MCP Server listening on port ${PORT} with ${MCP_TIMEOUT/1000}s timeout`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`MCP endpoint: /mcp?transportType=streamable-http (modern), /mcp?transportType=sse (SSE)`);
  console.log(`Legacy endpoints: /sse and /messages also supported`);
});
