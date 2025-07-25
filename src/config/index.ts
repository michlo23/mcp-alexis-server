import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Server configuration
export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';

// AlexisHR API configuration
export const ALEXIS_API_BASE_URL = process.env.ALEXIS_API_BASE_URL || 'https://api.alexishr.com/v1';
export const ALEXIS_EMPLOYEE_API_URL = process.env.ALEXIS_EMPLOYEE_API_URL || 'https://api.alexishr.com/v1/employee';
export const ALEXIS_DEPARTMENT_API_URL = process.env.ALEXIS_DEPARTMENT_API_URL || 'https://api.alexishr.com/v1/department';
export const ALEXIS_LEAVE_API_URL = process.env.ALEXIS_LEAVE_API_URL || 'https://api.alexishr.com/v1/leave';
export const ALEXIS_OFFICE_API_URL = process.env.ALEXIS_OFFICE_API_URL || 'https://api.alexishr.com/v1/office';
export const ALEXIS_GRAPHQL_API_URL = process.env.ALEXIS_GRAPHQL_API_URL || 'https://api.alexishr.com/v2/graphql';

// Logging
export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Server info for MCP
export const SERVER_INFO = {
  name: 'alexis-mcp-server',
  version: '1.0.0',
  description: 'AlexisHR MCP Server supporting both legacy SSE and stream protocols'
};

// MCP Server timeout configuration (in milliseconds)
export const MCP_TIMEOUT = process.env.MCP_TIMEOUT ? parseInt(process.env.MCP_TIMEOUT, 10) : 120000; // 2 minutes default
