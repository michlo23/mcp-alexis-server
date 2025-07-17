import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerEmployeeTools } from './employeeTools';
import { registerDepartmentTools } from './departmentTools';
import { registerLeaveTools } from './leaveTools';

/**
 * Register all tools to the MCP server
 */
export const registerAllTools = (server: McpServer) => {
  // Register employee tools
  registerEmployeeTools(server);
  
  // Register department tools
  registerDepartmentTools(server);
  
  // Register leave tools
  registerLeaveTools(server);

  console.log('All AlexisHR tools registered successfully');
};
