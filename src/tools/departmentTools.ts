import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AlexisApiClient } from '../api/alexisApi';
import { DepartmentFilters } from '../types/alexis';

/**
 * Register department-related tools to the MCP server
 */
export const registerDepartmentTools = (server: McpServer) => {
  /**
   * getAllDepartments tool - Fetches all departments from AlexisHR API with optional filtering
   */
  server.registerTool(
    'getAllDepartments',
    {
      title: 'Get All Departments',
      description: 'Fetches all departments from AlexisHR API with optional filtering.',
      inputSchema: {
        limit: z.number().optional().default(500),
        filters: z.object({
          name: z.string().optional(),
          companyId: z.string().optional(),
          costCenterId: z.string().optional(),
          effectiveCostCenterId: z.string().optional(),
          parentId: z.string().optional(),
        }).optional(),
      }
    },
    async ({ limit, filters }, context: any) => {
      try {
        // Get JWT token from request
        const jwtToken = context.requestInfo.headers.authorization;
        if (!jwtToken) {
            throw new Error('Authentication required');
        }

        // Create API client with JWT token
        const apiClient = new AlexisApiClient(jwtToken);
        
        // Make API call
        const result = await apiClient.getAllDepartments(limit, filters as DepartmentFilters);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        console.error('Error in getAllDepartments tool:', error);
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              error: true, 
              message: error.message || 'Failed to fetch departments' 
            }, null, 2)
          }]
        };
      }
    }
  );

  /**
   * getDepartmentById tool - Fetches a specific department by its unique ID
   */
  server.registerTool(
    'getDepartmentById',
    {
      title: 'Get Department By ID',
      description: 'Fetches a specific department by its unique ID.',
      inputSchema: {
        departmentId: z.string(),
      }
    },
    async ({ departmentId }, context: any) => {
      try {
        // Get JWT token from request
        const jwtToken = context.requestInfo.headers.authorization;
        if (!jwtToken) {
          throw new Error('Authentication required');
        }

        // Create API client with JWT token
        const apiClient = new AlexisApiClient(jwtToken);
        
        // Make API call
        const result = await apiClient.getDepartmentById(departmentId);
        
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: any) {
        console.error(`Error in getDepartmentById tool (ID: ${departmentId}):`, error);
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({ 
              error: true, 
              message: error.message || `Failed to fetch department with ID ${departmentId}` 
            }, null, 2)
          }]
        };
      }
    }
  );
};
